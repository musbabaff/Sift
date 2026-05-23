import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createSupabaseAdminClient } from '../lib/supabase/admin';

async function diagnose() {
  const supabase = createSupabaseAdminClient();
  
  console.log('--- DATABASE DIAGNOSTICS ---');
  
  // 1. Check Row Count
  const { count, error: countError } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error(' ❌ Error counting rows:', countError.message);
    process.exit(1);
  }

  console.log(` - Total rows in articles table: ${count}`);

  if (!count || count === 0) {
    console.log(' ⚠️ WARNING: The articles table is completely empty! Please run the ingestion script to populate it.');
    process.exit(0);
  }

  // 2. Fetch Sample Rows
  const { data: samples, error: sampleError } = await supabase
    .from('articles')
    .select('id, title, published_at, category, source, language, embedding')
    .limit(3);

  if (sampleError) {
    console.error(' ❌ Error retrieving sample rows:', sampleError.message);
    process.exit(1);
  }

  console.log('\n--- SAMPLE ROWS ---');
  samples.forEach((row, i) => {
    console.log(`\nRow #${i + 1}:`);
    console.log(` - ID: ${row.id}`);
    console.log(` - Title: "${row.title}"`);
    console.log(` - Published At: ${row.published_at}`);
    console.log(` - Category: ${row.category}`);
    console.log(` - Source: ${row.source}`);
    console.log(` - Language: ${row.language}`);
    console.log(` - Embedding populated: ${row.embedding ? 'Yes (length: ' + (row.embedding as any).length + ')' : 'No'}`);
  });
}

diagnose().catch(console.error);
