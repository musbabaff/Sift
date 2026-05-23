import { getChatCompletion } from '../ai/openai';

export interface ParsedQuery {
  topic: string;
  date_from: string | null;
  date_to: string | null;
  category_hint: string | null;
  source_hint: string | null;
  sentiment_hint: 'negative' | 'positive' | 'neutral' | null;
}

/**
 * Parses a natural language search query using OpenAI's gpt-4o-mini
 * to extract topics, date filters, and metadata category/source/sentiment hints.
 */
export async function parseSearchQuery(query: string): Promise<ParsedQuery> {
  const startTime = Date.now();
  console.log(`[Query Parser] Commencing NL interpretation for query: "${query}"`);

  const systemPrompt = `You are Sift's Query Understanding Engine, an expert at converting unstructured natural language search inputs into structured query parameters.

Your target dataset contains news articles published strictly between May 10, 2026 and May 15, 2026.
Assume TODAY is May 23, 2026.

Analyze the query and return a valid JSON object matching the following TypeScript schema:
{
  "topic": "string - a cleaned, optimized search term query (e.g. 'risky banking' or 'taxes'). Remove date descriptions, source keywords, or category names from here unless they are conceptually central.",
  "date_from": "ISO-8601 string or null - resolved start boundary (always UTC). Resolve relative dates (e.g. 'on May 14', 'yesterday', 'after May 11') specifically inside the dataset range (May 10 to May 15, 2026). If 'after May 11', it resolves to '2026-05-12T00:00:00.000Z'. If 'on May 14', it resolves to '2026-05-14T00:00:00.000Z'. If no date restriction is mentioned, set to null.",
  "date_to": "ISO-8601 string or null - resolved end boundary (always UTC). For single days (e.g. 'on May 14'), date_to is set to the end of that day: '2026-05-14T23:59:59.999Z'. If 'before May 13', it resolves to '2026-05-12T23:59:59.999Z'. If no date restriction is mentioned, set to null.",
  "category_hint": "string or null - e.g. 'economy', 'politics', 'sports', 'social' if the user explicitly specifies the category or it is highly implied. Else null.",
  "source_hint": "string or null - pure domain or source keyword (e.g. 'oxu.az', 'centralbank', 'socar') if implied or requested. Else null.",
  "sentiment_hint": "'negative' | 'positive' | 'neutral' | null - if negative sentiment, financial risk, oil spill, corruption is searched, return 'negative'. If growth, approval, success, return 'positive'. Else null."
}

Guidelines:
1. Relative dates MUST resolve within the hackathon window: May 10-15, 2026.
2. If the user searches for "AccessBank", topic is "AccessBank", category_hint is "economy" or "banking" (if implied), other hints null.
3. Be highly precise. Return ONLY the JSON object. Do not include markdown codeblocks or extra explanations.`;

  try {
    const rawResult = await getChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Query to parse: "${query}"` }
    ], {
      response_format: { type: 'json_object' },
      temperature: 0.0 // Ensure strict deterministic outputs
    });

    if (!rawResult) {
      throw new Error('Received empty response from OpenAI query parser.');
    }

    const parsed: ParsedQuery = JSON.parse(rawResult.trim());
    const elapsed = Date.now() - startTime;
    
    console.log(`[Query Parser] Parsed query successfully in ${elapsed}ms:`, JSON.stringify(parsed));
    return parsed;
  } catch (error) {
    console.error('[Query Parser Error] Failed to parse raw search query, falling back:', error);
    // Secure fallback object to guarantee graceful degradation
    return {
      topic: query,
      date_from: null,
      date_to: null,
      category_hint: null,
      source_hint: null,
      sentiment_hint: null
    };
  }
}
