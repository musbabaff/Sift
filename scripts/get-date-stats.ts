import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createSupabaseAdminClient } from '../lib/supabase/admin';

async function main() {
  const supabase = createSupabaseAdminClient();
  
  // Query using raw postgres or aggregate
  const { data, error } = await supabase
    .from('articles')
    .select('published_at')
    .order('published_at', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }
  
  // We can fetch in batches or use the supabase RPC if we have one. But let's write a simple query to select min and max.
  // Wait, let's select count, min and max using standard supabase syntax
  const { data: first } = await supabase
    .from('articles')
    .select('published_at')
    .order('published_at', { ascending: true })
    .limit(1);

  const { data: last } = await supabase
    .from('articles')
    .select('published_at')
    .order('published_at', { ascending: false })
    .limit(1);

  console.log('Min date:', first?.[0]?.published_at);
  console.log('Max date:', last?.[0]?.published_at);
}
main();
