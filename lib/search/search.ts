import { createSupabaseAdminClient } from '../supabase/admin';
import { getEmbeddingsBatch } from '../ai/openai';
import { parseSearchQuery, ParsedQuery } from './parse-query';

export interface SearchResult {
  id: number;
  link: string;
  title: string;
  content: string;
  category: string;
  source: string;
  language: string;
  published_at: string;
  semantic_score: number;
  keyword_score: number;
  combined_score: number;
  relevance_score: number; // 0 - 100
  match_reason: string;
}

export interface HybridSearchResponse {
  query: string;
  interpretation: ParsedQuery;
  results: SearchResult[];
  telemetry: {
    parseTimeMs: number;
    embedTimeMs: number;
    dbTimeMs: number;
    totalTimeMs: number;
    fallbackApplied: boolean;
  };
}

/**
 * Compiles a detailed, readable explanation of why an article matched the query criteria
 */
function compileMatchReason(
  title: string,
  content: string,
  semanticScore: number,
  keywordScore: number,
  hasDateFilter: boolean,
  category: string,
  source: string
): string {
  const reasons: string[] = [];

  // 1. Semantic match strength
  if (semanticScore >= 0.85) {
    reasons.push('Highly relevant conceptual match');
  } else if (semanticScore >= 0.75) {
    reasons.push('Strong semantic match');
  } else if (semanticScore >= 0.65) {
    reasons.push('Conceptual match');
  }

  // 2. Keyword match strength
  if (keywordScore > 0.05) {
    reasons.push('Exact text match');
  }

  // 3. Date constraints
  if (hasDateFilter) {
    reasons.push('Matches date constraint');
  }

  // 4. Source or Category alignment
  if (category && category.toLowerCase() !== 'uncategorized') {
    reasons.push(`In category: ${category}`);
  }

  if (reasons.length === 0) {
    return 'Matched by semantic indexing';
  }

  // Combine top 3 matching characteristics
  return reasons.slice(0, 3).join(' · ');
}

/**
 * Normalizes PostgreSQL combined scores to a high-fidelity 0-100 relevance rank
 */
function normalizeRelevanceScore(combinedScore: number): number {
  // SQL combined score = 0.7 * semantic_similarity + 0.3 * keyword_score
  // Let's scale and map to 0-100
  // Semantic similarity typically ranges from 0.3 to 0.9.
  // Keyword score (ts_rank) ranges from 0.0 to 1.0.
  // Let's project this linearly and cap strictly between 0 and 100.
  const score = Math.round(combinedScore * 100);
  return Math.min(100, Math.max(0, score));
}

/**
 * Core Hybrid Search Execution Engine
 */
export async function executeHybridSearch(
  query: string,
  options: { limit?: number } = {}
): Promise<HybridSearchResponse> {
  const overallStart = Date.now();
  const limit = options.limit || 12;

  // 1. Parse raw natural-language query
  const parseStart = Date.now();
  const interpretation = await parseSearchQuery(query);
  const parseTimeMs = Date.now() - parseStart;

  // 2. Generate vector embedding for the extracted topic query
  const embedStart = Date.now();
  const topicQuery = interpretation.topic || query;
  const embeddingArrays = await getEmbeddingsBatch([topicQuery]);
  const queryEmbedding = embeddingArrays[0];
  const embedTimeMs = Date.now() - embedStart;

  // 3. Connect and execute match_articles RPC in Supabase
  const dbStart = Date.now();
  const supabase = createSupabaseAdminClient();
  
  let fallbackApplied = false;
  
  // Call RPC with extracted filter fields
  let { data: rawArticles, error: dbError } = await supabase.rpc('match_articles', {
    query_embedding: queryEmbedding,
    query_text: topicQuery,
    date_from: interpretation.date_from,
    date_to: interpretation.date_to,
    filter_category: interpretation.category_hint,
    filter_source: interpretation.source_hint,
    match_count: limit * 2 // Fetch slightly more to re-rank / trim
  });

  if (dbError) {
    console.error('[Search Engine Error] Failed to execute hybrid RPC search query:', dbError.message);
    throw new Error(`Database retrieval error: ${dbError.message}`);
  }

  // Graceful Filtering Fallback Check:
  // If strict metadata filters (category/source) are set but return 0 rows, 
  // clear filters and search concept/dates only so the user gets relevant hits.
  const hasMetadataFilters = interpretation.category_hint !== null || interpretation.source_hint !== null;
  if ((!rawArticles || rawArticles.length === 0) && hasMetadataFilters) {
    console.log('[Search Engine] Strict filters returned 0 rows. Retrying query with filters bypassed...');
    fallbackApplied = true;

    const retryResponse = await supabase.rpc('match_articles', {
      query_embedding: queryEmbedding,
      query_text: topicQuery,
      date_from: interpretation.date_from,
      date_to: interpretation.date_to,
      filter_category: null,
      filter_source: null,
      match_count: limit * 2
    });

    if (retryResponse.error) {
      console.error('[Search Engine Error] Fallback query retry failed:', retryResponse.error.message);
    } else {
      rawArticles = retryResponse.data;
    }
  }

  const dbTimeMs = Date.now() - dbStart;

  // 4. Compile results with normalized relevance ratings and match reasons
  const results: SearchResult[] = (rawArticles || []).map((art: any) => {
    const semantic_score = art.semantic_score || 0;
    const keyword_score = art.keyword_score || 0;
    const combined_score = art.combined_score || 0;

    const relevance_score = normalizeRelevanceScore(combined_score);
    const match_reason = compileMatchReason(
      art.title || '',
      art.content || '',
      semantic_score,
      keyword_score,
      interpretation.date_from !== null || interpretation.date_to !== null,
      art.category || '',
      art.source || ''
    );

    return {
      id: Number(art.id),
      link: art.link || '',
      title: art.title || '',
      content: art.content || '',
      category: art.category || 'Uncategorized',
      source: art.source || 'unknown',
      language: art.language || 'en',
      published_at: art.published_at || new Date().toISOString(),
      semantic_score,
      keyword_score,
      combined_score,
      relevance_score,
      match_reason
    };
  });

  // Slice results strictly to display limit
  const slicedResults = results.slice(0, limit);
  const totalTimeMs = Date.now() - overallStart;

  console.log(`[Search Engine] Search completed in ${totalTimeMs}ms. Found ${slicedResults.length} articles.`);

  return {
    query,
    interpretation,
    results: slicedResults,
    telemetry: {
      parseTimeMs,
      embedTimeMs,
      dbTimeMs,
      totalTimeMs,
      fallbackApplied
    }
  };
}
