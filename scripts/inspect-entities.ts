import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createSupabaseAdminClient } from '../lib/supabase/admin';

async function main() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('entity_stats')
    .select('*')
    .limit(10);
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}
main();
