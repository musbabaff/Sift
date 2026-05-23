import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { createSupabaseAdminClient } = await import('../lib/supabase/admin');
  const { extractTopFrequencies } = await import('../lib/entities/frequency');
  const { refineAndClassifyEntities } = await import('../lib/entities/refine');

  const args = process.argv.slice(2);
  
  const limitArgIndex = args.findIndex(arg => arg.startsWith('--limit'));
  let limit: number | null = null;
  if (limitArgIndex !== -1) {
    const val = args[limitArgIndex].includes('=') 
      ? args[limitArgIndex].split('=')[1] 
      : args[limitArgIndex + 1];
    if (val) limit = parseInt(val, 10);
  }

  console.log('----------------------------------------------------');
  console.log('         PRECOMPUTING CORPUS ENTITY STATS           ');
  console.log('----------------------------------------------------');
  console.log(`Article Limit: ${limit !== null ? limit : 'All (20,915)'}`);

  const supabase = createSupabaseAdminClient();
  const startTime = Date.now();

  // 1. Fetch Articles in batches
  console.log('Fetching articles from Supabase...');
  let articles: { title: string; content: string }[] = [];
  
  if (limit !== null) {
    const { data, error } = await supabase
      .from('articles')
      .select('title, content')
      .limit(limit);
      
    if (error) {
      console.error('[Error] Failed to fetch articles:', error.message);
      process.exit(1);
    }
    articles = data || [];
  } else {
    // Page through all articles (in chunks of 3000 to prevent memory blowup)
    let page = 0;
    const pageSize = 3000;
    while (true) {
      const start = page * pageSize;
      const end = start + pageSize - 1;
      
      const { data, error } = await supabase
        .from('articles')
        .select('title, content')
        .range(start, end);
        
      if (error) {
        console.error('[Error] Failed fetching batch:', error.message);
        process.exit(1);
      }
      
      if (!data || data.length === 0) break;
      
      articles.push(...data);
      console.log(` -> Fetched ${articles.length} articles...`);
      page++;
    }
  }

  console.log(`Loaded ${articles.length} total articles for processing.`);
  if (articles.length === 0) {
    console.log('No articles found in database. Exiting.');
    process.exit(0);
  }

  // 2. Tokenize and extract frequencies (top 80 candidates)
  console.log('Extracting frequent terms and n-grams...');
  const candidates = extractTopFrequencies(articles, 80);
  console.log(`Extracted top ${candidates.length} candidate terms from tokenizer.`);

  if (candidates.length === 0) {
    console.log('No terms extracted. Exiting.');
    process.exit(0);
  }

  // 3. Classify and refine candidates using ONE gpt-4o-mini call
  console.log('Refining and classifying top candidates via OpenAI...');
  const refinedEntities = await refineAndClassifyEntities(candidates);
  console.log(`OpenAI returned ${refinedEntities.length} valid classified entities.`);

  // 4. Map frequency counts back to the refined entities
  // (Handling overlapping terms and summing counts dynamically)
  console.log('Mapping counts back to refined proper-noun schemas...');
  const finalStats: { term: string; type: string; count: number; language: string; scope: string }[] = [];

  for (const refined of refinedEntities) {
    const termLower = refined.term.toLowerCase();
    
    // Find all candidate frequency counts that match or overlap
    const matchingCandidates = candidates.filter(cand => {
      const candLower = cand.term.toLowerCase();
      return candLower === termLower || 
             candLower.includes(termLower) || 
             termLower.includes(candLower);
    });

    // Sum their counts
    const sumCount = matchingCandidates.reduce((acc, curr) => acc + curr.count, 0);
    const finalCount = sumCount > 0 ? sumCount : 10; // Fallback default count

    finalStats.push({
      term: refined.term,
      type: refined.type,
      count: finalCount,
      language: 'all', // General corpus scope
      scope: 'global'
    });
  }

  // Sort by count desc
  const sortedStats = finalStats.sort((a, b) => b.count - a.count);

  // 5. Wipe existing entity_stats table
  console.log('Wiping existing entity_stats records...');
  const { error: deleteError } = await supabase
    .from('entity_stats')
    .delete()
    .neq('id', 0);

  if (deleteError) {
    console.error('[Error] Failed to wipe entity stats table:', deleteError.message);
    process.exit(1);
  }

  // 6. Batch Insert finalized precomputations into Supabase
  console.log(`Inserting ${sortedStats.length} precomputed global entities...`);
  if (sortedStats.length > 0) {
    const { error: insertError } = await supabase
      .from('entity_stats')
      .insert(sortedStats);

    if (insertError) {
      console.error('[Error] Failed to insert stats:', insertError.message);
      process.exit(1);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('----------------------------------------------------');
  console.log('         PRECOMPUTATION COMPLETED SUCCESSFULLY       ');
  console.log('----------------------------------------------------');
  console.log(`Precomputed: ${sortedStats.length} global entities`);
  console.log(`Total processing time: ${elapsed}s`);
  console.log('Global Entity Intelligence is fully active!');
  console.log('----------------------------------------------------');
}

main().catch(err => {
  console.error('[Critical Failure] Global entity precomputation crashed:', err);
  process.exit(1);
});
