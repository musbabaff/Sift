import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractTopFrequencies } from '@/lib/entities/frequency';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { article_ids } = body;

    // Validate request parameter
    if (!article_ids || !Array.isArray(article_ids) || article_ids.length === 0) {
      return NextResponse.json({ entities: [] });
    }

    const cleanedIds = article_ids.map(Number).filter(id => !isNaN(id));
    if (cleanedIds.length === 0) {
      return NextResponse.json({ entities: [] });
    }

    console.log(`[API Live Entities] Analyzing result-set live. Articles count: ${cleanedIds.length}`);

    const supabase = createSupabaseAdminClient();

    // 1. Retrieve the text contents of the specified articles
    const { data: articles, error } = await supabase
      .from('articles')
      .select('title, content')
      .in('id', cleanedIds);

    if (error) {
      console.error('[API Live Entities Error] Database fetch failed:', error.message);
      return NextResponse.json(
        { error: `Database failed to query article contents: ${error.message}` },
        { status: 500 }
      );
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ entities: [] });
    }

    // 2. Tokenize and extract top terms live (limit to top 15 results for speed/UI focus)
    const rawFrequencies = extractTopFrequencies(articles, 15);

    // 3. Fetch matched types from precomputed entity_stats
    const termsList = rawFrequencies.map(f => f.term);
    
    const { data: globalMatches, error: matchError } = await supabase
      .from('entity_stats')
      .select('term, type')
      .in('term', termsList);

    if (matchError) {
      console.warn('[API Live Entities] Warning: Failed to query type matches:', matchError.message);
    }

    // Map matched types, or apply proper-noun casing fallback heuristics
    const typeMapping = (globalMatches || []).reduce((acc, curr) => {
      acc[curr.term.toLowerCase()] = curr.type;
      return acc;
    }, {} as Record<string, string>);

    const finalizedEntities = rawFrequencies.map(freq => {
      const termLower = freq.term.toLowerCase();
      let type: 'ORG' | 'PERSON' | 'LOCATION' | 'TOPIC' = 'TOPIC';

      if (typeMapping[termLower]) {
        // Inherit verified type from precomputations
        type = typeMapping[termLower] as any;
      } else {
        // Capitalized bigram fallback heuristic
        const words = freq.term.split(' ');
        const isCapitalizedProperNoun = words.every(w => /^[A-ZА-ЯЁƏÖĞÜÇŞ]/.test(w));
        if (isCapitalizedProperNoun) {
          type = words.length > 1 ? 'ORG' : 'TOPIC';
        }
      }

      return {
        term: freq.term,
        count: freq.count,
        type
      };
    });

    console.log(`[API Live Entities] Processed live statistics successfully. Found ${finalizedEntities.length} terms.`);
    return NextResponse.json({ entities: finalizedEntities });

  } catch (error: any) {
    console.error('[API Live Entities Error] Unexpected exception occurred:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred while performing live entity analysis.' },
      { status: 500 }
    );
  }
}
