import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createSupabaseAdminClient } from '../lib/supabase/admin';
import { getEmbeddingsBatch } from '../lib/ai/openai';

async function testQuery() {
  const query = 'neft layihələri və iqtisadiyyat'; // "oil projects and economy" in Azerbaijani
  console.log(`Running test hybrid search query: "${query}"`);

  const supabase = createSupabaseAdminClient();

  try {
    // 1. Generate query embedding
    console.log('Generating embedding for the query...');
    const embeddings = await getEmbeddingsBatch([query]);
    const queryEmbedding = embeddings[0];
    console.log(`Query embedding generated. Dimensions: ${queryEmbedding.length}`);

    // 2. Query Supabase using match_articles RPC
    console.log('Querying match_articles RPC in Supabase...');
    const { data: results, error } = await supabase.rpc('match_articles', {
      query_embedding: queryEmbedding,
      query_text: query,
      match_count: 3
    });

    if (error) {
      console.error('[Error] RPC execution failed:', error.message);
      process.exit(1);
    }

    console.log('\n--- HYBRID SEARCH RESULT HITS ---');
    if (!results || results.length === 0) {
      console.log('No articles found matching the query.');
    } else {
      results.forEach((art: any, index: number) => {
        console.log(`\nHit #${index + 1}:`);
        console.log(`ID: ${art.id}`);
        console.log(`Title: ${art.title}`);
        console.log(`Source: ${art.source} | Language: ${art.language} | Published: ${art.published_at}`);
        console.log(`Semantic Similarity Score: ${art.semantic_score?.toFixed(4)}`);
        console.log(`Keyword Search Rank Score: ${art.keyword_score?.toFixed(4)}`);
        console.log(`Combined Hybrid Score: ${art.combined_score?.toFixed(4)}`);
        console.log(`Content Snippet: ${art.content ? art.content.substring(0, 150) + '...' : '[empty]'}`);
      });
    }
    console.log('---------------------------------\n');

  } catch (error) {
    console.error('[Error] Test query pipeline failed:', error);
    process.exit(1);
  }
}

testQuery();
