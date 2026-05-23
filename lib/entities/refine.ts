import { getChatCompletion } from '../ai/openai';

export interface RefinedEntity {
  term: string;
  type: 'ORG' | 'PERSON' | 'LOCATION' | 'TOPIC';
}

interface RefinedResponse {
  entities: RefinedEntity[];
}

/**
 * Uses a single cheap gpt-4o-mini call to clean and classify 
 * the top-frequency entity candidates into ORG/PERSON/LOCATION/TOPIC.
 */
export async function refineAndClassifyEntities(
  candidates: { term: string; count: number }[]
): Promise<RefinedEntity[]> {
  const startTime = Date.now();
  console.log(`[Entity Refinement] Commencing LLM classification on ${candidates.length} terms.`);

  const candidateList = candidates.map(c => `"${c.term}" (freq weight: ${c.count})`).join(', ');

  const systemPrompt = `You are Sift's Entity Classification and Cleaning Engine.
You will receive a list of frequent proper nouns and terms extracted from our news corpus in Azerbaijani, Russian, or English.

Your objective is to:
1. Classify each VALID entity or key search keyword into one of these strict types:
   - ORG: Organizations, companies, banks, state ministries, brands, clubs (e.g. "SOCAR", "AccessBank", "Mərkəzi Bank", "Unibank", "Neftçi").
   - PERSON: Politicians, executives, athletes, public figures (e.g. "İlham Əliyev", "Məzahir Pənahov", "Mikel Arteta").
   - LOCATION: Countries, cities, districts, regions, oceans, specific buildings/venues (e.g. "Azərbaycan", "Bakı", "Şuşa", "Qarabağ", "Bakı Metrosu").
   - TOPIC: Central, meaningful industry sectors, concepts, and keywords (e.g. "Kredit", "Vergi", "Pensiya", "Təhsil", "Şəhərsalma", "Festival").
2. DISCARD junk words, adjectives, verbs, generic numbers, or sentence-starting noises (e.g. "FOTO", "ÖZƏL", "RƏSMİ", "Fəaliyyətə", "Məlumata", "Daxil").
3. CLEAN the term: Correct spelling errors, standardize casing (Title Case for entities), and remove grammatical suffixes (e.g. convert "Şuşada" to "Şuşa", "metrosunda" to "Bakı Metrosu" or "Bakı").
4. MERGE duplicates or overlapping variations (e.g. combine "socar" and "socar-ın" into "SOCAR").
5. Return ONLY a valid JSON object matching the following structure:
{
  "entities": [
    { "term": "string (cleaned and Title Cased, e.g. 'Mərkəzi Bank')", "type": "ORG|PERSON|LOCATION|TOPIC" }
  ]
}

Do not include markdown tags, code blocks, or extra text. Output strictly pure JSON.`;

  try {
    const rawResult = await getChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Candidates to clean and classify: [ ${candidateList} ]` }
    ], {
      response_format: { type: 'json_object' },
      temperature: 0.0
    });

    if (!rawResult) {
      throw new Error('Received empty response from OpenAI entity refiner.');
    }

    const parsed: RefinedResponse = JSON.parse(rawResult.trim());
    const elapsed = Date.now() - startTime;
    
    console.log(`[Entity Refinement] Successfully refined and classified ${parsed.entities?.length || 0} entities in ${elapsed}ms.`);
    return parsed.entities || [];
  } catch (error) {
    console.error('[Entity Refinement Error] Failed to refine entities using LLM:', error);
    // Secure fallback: retain candidates but assign as TOPIC
    return candidates.slice(0, 30).map(c => ({
      term: c.term,
      type: 'TOPIC' as const
    }));
  }
}
