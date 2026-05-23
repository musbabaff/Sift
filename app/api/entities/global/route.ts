import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // ORG / PERSON / LOCATION / TOPIC
  const limit = parseInt(searchParams.get('limit') || '30', 10);

  console.log(`[API Global Entities] Fetching global stats. Type: ${type || 'all'} | Limit: ${limit}`);

  try {
    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from('entity_stats')
      .select('term, type, count, language')
      .eq('scope', 'global')
      .order('count', { ascending: false })
      .limit(limit);

    if (type) {
      // Filter by type if explicitly requested (e.g. type=ORG)
      query = query.eq('type', type.toUpperCase());
    }

    const { data: stats, error } = await query;

    if (error) {
      console.error('[API Global Entities Error] Database retrieval failed:', error.message);
      return NextResponse.json(
        { error: `Database failed to query entity statistics: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[API Global Entities] Successfully retrieved ${stats?.length || 0} entities.`);
    return NextResponse.json({ entities: stats || [] });

  } catch (error: any) {
    console.error('[API Global Entities Error] Unexpected exception occurred:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred while retrieving entity intelligence.' },
      { status: 500 }
    );
  }
}
