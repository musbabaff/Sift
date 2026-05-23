import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import pLimit from 'p-limit';
import { createSupabaseAdminClient } from '../lib/supabase/admin';
import { getEmbeddingsBatch, getCostReport } from '../lib/ai/openai';

// Ingestion settings
const BATCH_EMBED_SIZE = 100;     // Embed 100 rows per OpenAI API call
const BATCH_INSERT_SIZE = 100;    // Insert 100 rows per Supabase transaction
const CONCURRENT_API_LIMIT = 5;   // Concurrency limit for OpenAI embeddings requests

interface RawRow {
  link?: string;
  title?: string;
  content?: string;
  category?: string;
  created_at?: any;
}

interface IngestedArticle {
  link: string;
  title: string;
  content: string;
  category: string;
  source: string;
  language: string;
  published_at: string;
  embedding: number[];
}

/**
 * Normalizes Excel created_at values to ISO-8601 strings
 */
function parsePublishedAt(createdAtVal: any): string {
  if (!createdAtVal) return new Date().toISOString();
  if (createdAtVal instanceof Date) {
    return createdAtVal.toISOString();
  }
  const parsed = new Date(createdAtVal);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  // Fallback if parsing fails
  return new Date().toISOString();
}

/**
 * Extracts pure domain from URL to serve as source
 */
function extractSource(link: string): string {
  if (!link) return 'unknown';
  try {
    const url = new URL(link);
    let host = url.hostname;
    if (host.startsWith('www.')) {
      host = host.substring(4);
    }
    return host;
  } catch {
    const match = link.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    return match ? match[1] : 'unknown';
  }
}

/**
 * Detects language: az, ru, or en using precise character heuristics
 */
function detectLanguage(title: string, content: string): 'az' | 'ru' | 'en' {
  const combined = (title + ' ' + content).toLowerCase();
  
  // Azerbaijani Latin-specific chars: ə, ı, ö, ğ, ü, ç, ş
  const azRegex = /[əıöğüçş]/;
  // Cyrillic characters for Russian
  const ruRegex = /[\u0400-\u04FF]/;
  
  if (azRegex.test(combined)) {
    return 'az';
  }
  if (ruRegex.test(combined)) {
    return 'ru';
  }
  return 'en';
}

/**
 * Sanitizes and standardizes category labels
 */
function cleanCategory(category: any): string {
  if (!category) return 'Uncategorized';
  return String(category)
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * OpenAI Embeddings call with exponential backoff on 429 rate limit errors
 */
async function embedWithRetry(texts: string[], retries = 5, delay = 1000): Promise<number[][]> {
  try {
    return await getEmbeddingsBatch(texts, BATCH_EMBED_SIZE);
  } catch (error: any) {
    const isRateLimit = error?.status === 429 || 
                        error?.message?.toLowerCase().includes('rate limit') || 
                        error?.message?.includes('429');
    
    if (retries > 0 && isRateLimit) {
      console.warn(`[OpenAI 429] Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return embedWithRetry(texts, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Core Data Ingestion Pipeline Execution
 */
async function main() {
  const args = process.argv.slice(2);
  const resetFlag = args.includes('--reset');
  
  const limitArgIndex = args.findIndex(arg => arg.startsWith('--limit'));
  let limit: number | null = null;
  if (limitArgIndex !== -1) {
    const val = args[limitArgIndex].includes('=') 
      ? args[limitArgIndex].split('=')[1] 
      : args[limitArgIndex + 1];
    if (val) limit = parseInt(val, 10);
  }

  const excelPath = path.join(process.cwd(), 'news_data.xlsx');
  
  console.log('----------------------------------------------------');
  console.log('                SIFT DATA INGESTION                 ');
  console.log('----------------------------------------------------');
  console.log(`Excel Path: ${excelPath}`);
  console.log(`Reset: ${resetFlag ? 'Yes' : 'No'}`);
  console.log(`Limit: ${limit !== null ? limit : 'All'}`);
  
  // Verify Excel file exists
  if (!fs.existsSync(excelPath)) {
    console.error(`[Error] Dataset file not found at: ${excelPath}`);
    console.error('Please place "news_data.xlsx" in the project root directory.');
    process.exit(1);
  }

  const supabase = createSupabaseAdminClient();

  // Handle Idempotency / Reset
  const { count, error: countError } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('[Database Error] Failed to connect or query articles count:', countError.message);
    process.exit(1);
  }

  const currentCount = count || 0;
  console.log(`Current article count in database: ${currentCount}`);

  if (currentCount > 0 && !resetFlag) {
    console.log(`[Abort] Database already contains ${currentCount} articles.`);
    console.log('To reload, run this script with the --reset flag: pnpm tsx scripts/ingest.ts --reset');
    process.exit(0);
  }

  if (resetFlag && currentCount > 0) {
    console.log('Wiping existing database articles in batches of 500 to avoid statement timeouts...');
    let batchIndex = 1;
    while (true) {
      const { data: idRows, error: fetchError } = await supabase
        .from('articles')
        .select('id')
        .limit(500);

      if (fetchError) {
        console.error('[Database Error] Failed to fetch IDs for deletion:', fetchError.message);
        process.exit(1);
      }

      if (!idRows || idRows.length === 0) {
        break; // Database is fully wiped
      }

      const ids = idRows.map(r => r.id);
      const { error: deleteError } = await supabase
        .from('articles')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error('[Database Error] Failed to delete batch:', deleteError.message);
        process.exit(1);
      }

      console.log(` -> Batched Wipe #${batchIndex}: Deleted ${ids.length} articles.`);
      batchIndex++;
    }
    console.log('Database successfully wiped in batches.');
  }

  // Read Excel File
  console.log('Reading news_data.xlsx spreadsheet...');
  const startTime = Date.now();
  const workbook = xlsx.readFile(excelPath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert worksheet to JSON rows
  let rows = xlsx.utils.sheet_to_json<RawRow>(sheet);
  console.log(`Found ${rows.length} total rows in spreadsheet.`);

  // Apply limit for test/subset runs
  if (limit !== null) {
    rows = rows.slice(0, limit);
    console.log(`Truncated dataset to first ${limit} rows for execution.`);
  }

  if (rows.length === 0) {
    console.log('No rows to ingest. Exiting.');
    process.exit(0);
  }

  // Pre-process rows (derive metadata, handle clean categories, language heuristics)
  console.log('Preprocessing rows...');
  const processedRows = rows.map((row) => {
    const title = String(row.title || '').trim();
    const content = String(row.content || '').trim();
    const link = String(row.link || '').trim();
    const category = cleanCategory(row.category);
    const source = extractSource(link);
    const language = detectLanguage(title, content);
    const published_at = parsePublishedAt(row.created_at);

    return {
      link,
      title,
      content,
      category,
      source,
      language,
      published_at,
      // We will fill the embedding array below
      embedding: [] as number[],
    };
  });

  console.log('Generating embeddings in batches of 100 using text-embedding-3-small...');
  const limitPromise = pLimit(CONCURRENT_API_LIMIT);

  // Group text strings to embed (truncate content to 1000 characters to stay within safety tokens limits)
  const embedTexts = processedRows.map(
    row => `${row.title}\n\n${row.content.substring(0, 1000)}`
  );

  const batchCount = Math.ceil(embedTexts.length / BATCH_EMBED_SIZE);
  console.log(`Total embedding batches to generate: ${batchCount}`);

  const embeddingPromises = Array.from({ length: batchCount }, (_, index) => {
    const start = index * BATCH_EMBED_SIZE;
    const chunk = embedTexts.slice(start, start + BATCH_EMBED_SIZE);

    return limitPromise(async () => {
      const results = await embedWithRetry(chunk);
      return { start, results };
    });
  });

  // Execute embeddings generation concurrently
  const completedEmbeddings = await Promise.all(embeddingPromises);

  // Map generated embeddings back to their respective processed rows
  for (const { start, results } of completedEmbeddings) {
    for (let i = 0; i < results.length; i++) {
      if (processedRows[start + i]) {
        processedRows[start + i].embedding = results[i];
      }
    }
  }

  console.log('Embeddings successfully generated.');
  console.log('Inserting articles into Supabase in chunks of 500...');

  let insertedCount = 0;
  for (let i = 0; i < processedRows.length; i += BATCH_INSERT_SIZE) {
    const chunk = processedRows.slice(i, i + BATCH_INSERT_SIZE);
    
    const { error: insertError } = await supabase
      .from('articles')
      .insert(chunk);

    if (insertError) {
      console.error(`[Database Error] Insert failed at index ${i}:`, insertError.message);
      process.exit(1);
    }

    insertedCount += chunk.length;
    
    // Logging progress telemetry
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const costReport = getCostReport();
    console.log(
      `-> Ingested: ${insertedCount}/${processedRows.length} articles | Time elapsed: ${elapsed}s | Est. Cost: $${costReport.costs.total.toFixed(4)}`
    );
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const finalCostReport = getCostReport();

  console.log('----------------------------------------------------');
  console.log('             INGESTION RUN COMPLETE                 ');
  console.log('----------------------------------------------------');
  console.log(`Total successfully ingested: ${insertedCount} articles`);
  console.log(`Overall ingestion run time: ${totalElapsed} seconds`);
  console.log(finalCostReport.formatted);
  console.log('Ready for query and search testing.');
  console.log('----------------------------------------------------');
}

main().catch((err) => {
  console.error('[Critical Pipeline Failure] Uncaught exception occurred during ingestion:', err);
  process.exit(1);
});
