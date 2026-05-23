/**
 * Sift Fuzzy Search — "Did you mean?" suggestion engine.
 * Uses Levenshtein distance to find the closest known entity/term
 * when a user makes a typo (e.g., "Sacar" → "SOCAR").
 */

/**
 * Calculates the Levenshtein edit distance between two strings.
 * Lower distance = more similar.
 */
function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));

  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[la][lb];
}

/**
 * Finds the best fuzzy match for a query term from a list of known terms.
 * Returns null if no close match is found (distance threshold > 40% of word length).
 */
export function findFuzzyMatch(
  queryTerm: string,
  knownTerms: string[]
): { suggestion: string; distance: number } | null {
  if (!queryTerm || queryTerm.length < 3 || knownTerms.length === 0) return null;

  const normalized = queryTerm.toLowerCase().trim();
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const term of knownTerms) {
    const termLower = term.toLowerCase();

    // Skip exact matches — no suggestion needed
    if (termLower === normalized) return null;

    // Skip if term is too different in length (optimization)
    if (Math.abs(term.length - queryTerm.length) > 3) continue;

    const dist = levenshtein(normalized, termLower);

    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = term;
    }
  }

  // Only suggest if the distance is reasonable (max 40% of the query length, and at least 1)
  const maxAllowedDistance = Math.max(1, Math.ceil(queryTerm.length * 0.4));

  if (bestMatch && bestDistance > 0 && bestDistance <= maxAllowedDistance) {
    return { suggestion: bestMatch, distance: bestDistance };
  }

  return null;
}

/**
 * Extracts individual words from a query and finds fuzzy matches for each.
 * Returns the corrected full query string if any word has a match.
 */
export function getSuggestion(
  query: string,
  knownTerms: string[]
): string | null {
  const words = query.trim().split(/\s+/);
  let hasSuggestion = false;
  const correctedWords: string[] = [];

  for (const word of words) {
    // Skip very short words (likely prepositions, stopwords)
    if (word.length < 3) {
      correctedWords.push(word);
      continue;
    }

    const match = findFuzzyMatch(word, knownTerms);
    if (match) {
      correctedWords.push(match.suggestion);
      hasSuggestion = true;
    } else {
      correctedWords.push(word);
    }
  }

  return hasSuggestion ? correctedWords.join(' ') : null;
}
