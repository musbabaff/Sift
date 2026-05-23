import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createSupabaseAdminClient } from '../lib/supabase/admin';
import { extractTopFrequencies } from '../lib/entities/frequency';

async function main() {
  const supabase = createSupabaseAdminClient();
  
  console.log('Fetching all articles in batches...');
  const articles: { title: string; content: string; published_at: string }[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('articles')
      .select('title, content, published_at')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error(error);
      break;
    }
    if (!data || data.length === 0) break;
    
    articles.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  
  console.log(`Loaded ${articles.length} articles.`);
  
  // Cutoff at May 14
  const cutoff = new Date('2026-05-14T00:00:00Z');
  const prevArticles = articles.filter(a => a.published_at && new Date(a.published_at) < cutoff);
  const recentArticles = articles.filter(a => a.published_at && new Date(a.published_at) >= cutoff);
  
  console.log(`Previous period articles: ${prevArticles.length}`);
  console.log(`Recent period articles: ${recentArticles.length}`);
  
  console.log('Extracting frequencies for both periods...');
  const prevCandidates = extractTopFrequencies(prevArticles, 1000);
  const recentCandidates = extractTopFrequencies(recentArticles, 1000);
  
  // Let's test for some sample terms
  const testTerms = ['SOCAR', 'Mərkəzi Bank', 'AccessBank', 'İlham Əliyev', 'Bakı', 'Qarabağ', 'Türkiyə', 'neft'];
  
  console.log('\nCalculated Trends (Cutoff: May 14):');
  for (const term of testTerms) {
    const termLower = term.toLowerCase();
    
    const matchingPrev = prevCandidates.filter(cand => {
      const candLower = cand.term.toLowerCase();
      return candLower === termLower || candLower.includes(termLower) || termLower.includes(candLower);
    });
    
    const matchingRecent = recentCandidates.filter(cand => {
      const candLower = cand.term.toLowerCase();
      return candLower === termLower || candLower.includes(termLower) || termLower.includes(candLower);
    });
    
    const prevCount = matchingPrev.reduce((acc, curr) => acc + curr.count, 0);
    const recentCount = matchingRecent.reduce((acc, curr) => acc + curr.count, 0);
    
    const prevRatio = prevCount / prevArticles.length;
    const recentRatio = recentCount / recentArticles.length;
    
    let trend = 0;
    if (prevRatio === 0) {
      trend = recentRatio > 0 ? 100 : 0;
    } else {
      trend = Math.round(((recentRatio - prevRatio) / prevRatio) * 100);
    }
    
    console.log(`- ${term}: prevCount=${prevCount}, recentCount=${recentCount}, trend=${trend >= 0 ? '+' : ''}${trend}%`);
  }
}
main();
