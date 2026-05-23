import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createSupabaseAdminClient } from '../lib/supabase/admin';

async function main() {
  const supabase = createSupabaseAdminClient();
  
  let page = 0;
  const pageSize = 1000;
  const days: Record<string, number> = {};
  let totalFetched = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('articles')
      .select('published_at')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error(error);
      break;
    }
    if (!data || data.length === 0) break;
    
    totalFetched += data.length;
    for (const row of data) {
      if (row.published_at) {
        const d = row.published_at.substring(0, 10);
        days[d] = (days[d] || 0) + 1;
      }
    }
    
    if (data.length < pageSize) {
      break;
    }
    page++;
  }
  
  console.log('Total fetched:', totalFetched);
  console.log('Daily article count:');
  console.log(Object.entries(days).sort((a,b) => a[0].localeCompare(b[0])));
}
main();
