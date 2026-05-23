import { isStopword } from './stopwords';

export interface EntityCandidate {
  term: string;
  count: number;
}

/**
 * Tokenizes text and splits it into sentences to trace proper capitalizations
 */
function splitIntoSentences(text: string): string[] {
  // Split by standard punctuation or newlines
  return text.split(/(?:[.\n!?])+/);
}

/**
 * Clean punctuation while keeping multilingual letters and spaces
 */
function cleanText(text: string): string {
  // Strip punctuation but keep spaces, alphanumeric characters, Azerbaijan-specific Latin glyps, and Cyrillic
  return text.replace(/[^\w\sа-яА-ЯёЁəıöğüçşƏIÖĞÜÇŞ-]/g, ' ');
}

/**
 * Analyzes frequency of unigrams and bigrams with Named Entity Boosting
 */
export function extractTopFrequencies(
  texts: { title: string; content: string }[],
  limit = 80
): EntityCandidate[] {
  const termCounts: Record<string, number> = {};

  for (const item of texts) {
    const combinedText = `${item.title || ''}\n${item.content || ''}`;
    const sentences = splitIntoSentences(combinedText);

    for (const sentence of sentences) {
      const cleaned = cleanText(sentence);
      // Split by whitespace
      const rawWords = cleaned.split(/\s+/).filter(w => w.trim().length > 0);
      
      if (rawWords.length === 0) continue;

      // 1. Process Unigrams
      rawWords.forEach((word, index) => {
        if (isStopword(word)) return;

        // Named Entity Boost Check:
        // A word gets a boost if it starts with an uppercase letter AND it is NOT the first word of a sentence
        const isCapitalized = /^[A-ZА-ЯЁƏÖĞÜÇŞ]/.test(word);
        const isFirstWord = index === 0;
        const boostMultiplier = (isCapitalized && !isFirstWord) ? 2.5 : 1.0;

        // Normalize for counting
        const normalized = word.toLowerCase();
        
        // Skip short noise
        if (normalized.length <= 2) return;

        termCounts[normalized] = (termCounts[normalized] || 0) + (1 * boostMultiplier);
      });

      // 2. Process Bigrams (Catching compound names e.g. "Mərkəzi Bank", "İlham Əliyev")
      for (let i = 0; i < rawWords.length - 1; i++) {
        const w1 = rawWords[i];
        const w2 = rawWords[i + 1];

        // Skip if either word is a stopword or too short
        if (isStopword(w1) || isStopword(w2)) continue;
        if (w1.length <= 2 || w2.length <= 2) continue;

        // Bigram Named Entity Boost:
        // Boost if both words are capitalized
        const w1Cap = /^[A-ZА-ЯЁƏÖĞÜÇŞ]/.test(w1);
        const w2Cap = /^[A-ZА-ЯЁƏÖĞÜÇŞ]/.test(w2);
        const boostMultiplier = (w1Cap && w2Cap) ? 2.5 : 1.0;

        // Keep proper noun bigrams in Title Case, else lowercase
        const bigramTerm = (w1Cap && w2Cap)
          ? `${w1} ${w2}`
          : `${w1.toLowerCase()} ${w2.toLowerCase()}`;

        termCounts[bigramTerm] = (termCounts[bigramTerm] || 0) + (1 * boostMultiplier);
      }
    }
  }

  // Convert map to sorted array
  return Object.entries(termCounts)
    .map(([term, count]) => ({
      // Capitalize first letters of lowercase terms to look beautiful in the cloud
      term: term.includes(' ') || /^[A-ZА-ЯЁƏÖĞÜÇŞ]/.test(term) 
        ? term 
        : term.charAt(0).toUpperCase() + term.slice(1),
      count: Math.round(count),
    }))
    // Filter out generic capitalized sentence-starting noises or common nouns
    .filter(item => item.term.length > 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
