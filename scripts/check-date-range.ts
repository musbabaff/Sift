import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createSupabaseAdminClient } from '../lib/supabase/admin';

async function main() {
  const supabase = createSupabaseAdminClient();
  
  const { data: minMax, error: minMaxErr } = await supabase
    .from('articles')
    .select('published_at')
    .order('published_at', { ascending: true });

  if (minMaxErr) {
    console.error(minMaxErr);
    return;
  }
  
  if (minMax && minMax.length > 0) {
    console.log('Total articles:', minMax.length);
    console.log('Min Date:', minMax[0].published_at);
    console.log('Max Date:', minMax[minMax.length - 1].published_at);
    
    // Let's count how many are in May 2026 versus April 2026, or how they are distributed
    const dates = minMax.map(a => new Date(a.published_at).toISOString().split('T')[0]);
    const counts: Record<string, number> = {};
    for (const d of dates) {
      counts[d] = (counts[d] || 0) + 1;
    }
    console.log('Date distribution (top 20 dates):', Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 20));
  } else {
    console.log('No articles found');
  }
}
main();
