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
      .select('term, type, count, language, scope')
      .like('scope', 'global%')
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

    // Map stats to parse trend from scope
    const entities = (stats || []).map((s: any) => {
      let trend = 0;
      if (s.scope && s.scope.includes(':')) {
        const parts = s.scope.split(':');
        trend = parseInt(parts[1], 10) || 0;
      }
      return {
        term: s.term,
        type: s.type,
        count: s.count,
        language: s.language,
        trend
      };
    });

    console.log(`[API Global Entities] Successfully retrieved ${entities.length} entities.`);
    return NextResponse.json({ entities });

  } catch (error: any) {
    console.error('[API Global Entities Error] Unexpected exception occurred:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred while retrieving entity intelligence.' },
      { status: 500 }
    );
  }
}
