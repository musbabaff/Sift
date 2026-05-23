import { loadEnvConfig } from '@next/env';
const loadedEnv = loadEnvConfig(process.cwd());
console.log('[Env Diagnostic] Loaded files:', loadedEnv.loadedEnvFiles.map(f => f.path));
console.log('[Env Diagnostic] OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 'undefined');
console.log('[Env Diagnostic] SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 'undefined');

import { executeHybridSearch } from '../lib/search/search';
import { getCostReport } from '../lib/ai/openai';

// Define the 5 golden test cases requested by the user
const testQueries = [
  'AccessBank',
  'SOCAR news on May 14',
  'banking news between May 12 and May 14',
  'economy news about taxes',
  'financial regulation'
];

async function runTests() {
  console.log('================================================================');
  console.log('              SIFT HYBRID SEARCH RETRIEVAL TESTS                ');
  console.log('================================================================\n');

  for (const query of testQueries) {
    console.log(`>>> RUNNING QUERY: "${query}"`);
    try {
      const response = await executeHybridSearch(query, { limit: 3 });

      console.log(`[Query Interpretation]`);
      console.log(` - Topic: "${response.interpretation.topic}"`);
      console.log(` - Date From: ${response.interpretation.date_from}`);
      console.log(` - Date To: ${response.interpretation.date_to}`);
      console.log(` - Category Hint: ${response.interpretation.category_hint}`);
      console.log(` - Source Hint: ${response.interpretation.source_hint}`);
      console.log(` - Sentiment Hint: ${response.interpretation.sentiment_hint}`);
      
      console.log(`[Telemetry]`);
      console.log(` - Total Time: ${response.telemetry.totalTimeMs}ms`);
      console.log(` - AI Parse: ${response.telemetry.parseTimeMs}ms`);
      console.log(` - DB Query: ${response.telemetry.dbTimeMs}ms`);
      console.log(` - Fallback Applied: ${response.telemetry.fallbackApplied ? 'Yes' : 'No'}`);

      console.log(`[Top Result Hits]`);
      if (response.results.length === 0) {
        console.log(' ❌ No results returned.');
      } else {
        response.results.forEach((art, i) => {
          console.log(`  Hit #${i + 1}:`);
          console.log(`   - Title: "${art.title}"`);
          console.log(`   - Source: ${art.source} | Category: ${art.category} | Lang: ${art.language}`);
          console.log(`   - Published: ${art.published_at}`);
          console.log(`   - Relevance: ${art.relevance_score}%`);
          console.log(`   - Scores: Sem=${art.semantic_score.toFixed(4)}, Key=${art.keyword_score.toFixed(4)}, Comb=${art.combined_score.toFixed(4)}`);
          console.log(`   - Reason: "${art.match_reason}"`);
        });
      }
      console.log('\n----------------------------------------------------------------\n');
    } catch (error: any) {
      console.error(` ❌ Query "${query}" failed during execution:`, error.message);
      console.log('\n----------------------------------------------------------------\n');
    }
  }

  const costReport = getCostReport();
  console.log('================================================================');
  console.log('                     TEST RUN COMPLETED                         ');
  console.log('================================================================');
  console.log(costReport.formatted);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('Fatal test execution failure:', err);
  process.exit(1);
});
