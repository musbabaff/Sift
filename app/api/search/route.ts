import { NextRequest, NextResponse } from 'next/server';
import { executeHybridSearch } from '@/lib/search/search';
import { getCostReport, getChatCompletion } from '@/lib/ai/openai';
import { getSuggestion } from '@/lib/search/fuzzy';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Cache known terms in memory (refreshes every deploy)
let knownTermsCache: string[] | null = null;

async function getKnownTerms(): Promise<string[]> {
  if (knownTermsCache) return knownTermsCache;
  
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from('entity_stats')
      .select('term')
      .eq('scope', 'global')
      .order('count', { ascending: false })
      .limit(200);

    knownTermsCache = (data || []).map((r: any) => r.term);
    console.log(`[Fuzzy] Loaded ${knownTermsCache.length} known terms for typo detection.`);
    return knownTermsCache;
  } catch (err) {
    console.warn('[Fuzzy] Could not load known terms:', err);
    return [];
  }
}

/**
 * Generates a brief AI executive summary of the top search results.
 * Only sends top-5 titles + short snippets to keep cost under $0.0001/call.
 */
async function generateAISummary(query: string, results: any[]): Promise<string | null> {
  if (results.length === 0) return null;

  const top5 = results.slice(0, 5);
  const articlesContext = top5.map((r, i) =>
    `${i + 1}. "${r.title}" (${r.source}, ${r.language.toUpperCase()}) — ${r.content?.substring(0, 100)}...`
  ).join('\n');

  try {
    const summary = await getChatCompletion([
      {
        role: 'system',
        content: 'You are a news analyst. Given search results, write a 2-3 sentence executive summary in English. Be concise, factual, and highlight the key themes. Do NOT use markdown formatting.'
      },
      {
        role: 'user',
        content: `Search query: "${query}"\n\nTop results:\n${articlesContext}\n\nWrite a brief summary:`
      }
    ], { temperature: 0.3, max_tokens: 150 });

    return summary || null;
  } catch (err) {
    console.warn('[AI Summary] Failed to generate summary:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const reqStart = Date.now();
  console.log('[API Search] Incoming search request received.');

  try {
    const body = await req.json();
    const { query } = body;

    // Validate request parameter
    if (!query || typeof query !== 'string' || query.trim() === '') {
      console.warn('[API Search] Rejected: Empty or invalid query parameter.');
      return NextResponse.json(
        { error: 'Query parameter "query" must be a non-empty string.' },
        { status: 400 }
      );
    }

    const sanitizedQuery = query.trim();
    console.log(`[API Search] Executing hybrid search for: "${sanitizedQuery}"`);

    // Execute search + load known terms for fuzzy matching in parallel
    const [searchResponse, knownTerms] = await Promise.all([
      executeHybridSearch(sanitizedQuery, { limit: 12 }),
      getKnownTerms(),
    ]);

    // Generate AI summary (non-blocking)
    const summaryPromise = generateAISummary(sanitizedQuery, searchResponse.results);

    // Fuzzy "Did you mean?" — compare query words against known entity terms
    const didYouMean = getSuggestion(sanitizedQuery, knownTerms);
    if (didYouMean) {
      console.log(`[Fuzzy] Suggestion for "${sanitizedQuery}": "${didYouMean}"`);
    }

    const costReport = getCostReport();
    const aiSummary = await summaryPromise;

    console.log(
      `[API Search] Success: "${sanitizedQuery}" | Overall req duration: ${Date.now() - reqStart}ms | OpenAI Total Est. Cost: $${costReport.costs.total}`
    );

    // Return search data with all enhancements
    return NextResponse.json({
      ...searchResponse,
      aiSummary,
      didYouMean,
      apiTelemetry: {
        apiDurationMs: Date.now() - reqStart,
        estimatedCostUsd: costReport.costs.total,
        formattedReport: costReport.formatted
      }
    });

  } catch (error: any) {
    console.error('[API Search Error] Encountered exception in POST search route:', error);
    
    // Graceful error recovery: Return user-friendly response rather than throwing internal Server 500 crashes
    return NextResponse.json(
      { 
        error: 'An internal error occurred while executing your search. Please verify your query format and try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
}
