import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createSupabaseAdminClient } from '../lib/supabase/admin';
import { extractTopFrequencies } from '../lib/entities/frequency';

async function main() {
  const supabase = createSupabaseAdminClient();
  
  console.log('Fetching all articles...');
  const { data: articles, error } = await supabase
    .from('articles')
    .select('title, content, published_at');
    
  if (error) {
    console.error(error);
    return;
  }
  
  // Group articles by day
  const dailyArticles: Record<string, typeof articles> = {};
  for (const art of articles) {
    if (art.published_at) {
      const d = art.published_at.substring(0, 10);
      if (!dailyArticles[d]) dailyArticles[d] = [];
      dailyArticles[d].push(art);
    }
  }
  
  const daysSorted = Object.keys(dailyArticles).sort();
  console.log('Days:', daysSorted);
  
  const testTerms = ['SOCAR', 'Mərkəzi Bank', 'AccessBank', 'İlham Əliyev', 'Bakı', 'Qarabağ', 'Türkiyə', 'neft'];
  
  for (const term of testTerms) {
    const termLower = term.toLowerCase();
    const dailyCounts: Record<string, number> = {};
    
    for (const d of daysSorted) {
      const dayArts = dailyArticles[d];
      const candidates = extractTopFrequencies(dayArts, 500);
      const matching = candidates.filter(cand => {
        const candLower = cand.term.toLowerCase();
        return candLower === termLower || candLower.includes(termLower) || termLower.includes(candLower);
      });
      const count = matching.reduce((acc, curr) => acc + curr.count, 0);
      dailyCounts[d] = count;
    }
    
    console.log(`\nDaily counts for "${term}":`);
    for (const d of daysSorted) {
      const ratio = (dailyCounts[d] / dailyArticles[d].length * 100).toFixed(2);
      console.log(`  ${d}: count=${dailyCounts[d]} (ratio=${ratio}%)`);
    }
  }
}
main();
