import OpenAI from 'openai';

// Model Constants
export const EMBED_MODEL = 'text-embedding-3-small';
export const CHAT_MODEL = 'gpt-4o-mini';

// Pricing constants per 1,000,000 tokens (USD)
const EMBED_PRICE_PER_M = 0.02;
const CHAT_INPUT_PRICE_PER_M = 0.15;
const CHAT_OUTPUT_PRICE_PER_M = 0.60;

// Simple internal telemetry/cost tracking state
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalEmbeddingTokens = 0;

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable.');
  }
  return new OpenAI({ apiKey });
}

/**
 * Tracks API costs and logs them clearly in telemetry
 */
export function trackCost(type: 'embedding' | 'chat', tokens: { input: number; output?: number }) {
  if (type === 'embedding') {
    totalEmbeddingTokens += tokens.input;
  } else if (type === 'chat') {
    totalInputTokens += tokens.input;
    if (tokens.output) totalOutputTokens += tokens.output;
  }
}

/**
 * Returns formatted telemetry information and overall estimated costs
 */
export function getCostReport() {
  const embeddingCost = (totalEmbeddingTokens / 1_000_000) * EMBED_PRICE_PER_M;
  const chatInputCost = (totalInputTokens / 1_000_000) * CHAT_INPUT_PRICE_PER_M;
  const chatOutputCost = (totalOutputTokens / 1_000_000) * CHAT_OUTPUT_PRICE_PER_M;
  const totalCost = embeddingCost + chatInputCost + chatOutputCost;

  return {
    embeddingTokens: totalEmbeddingTokens,
    chatInputTokens: totalInputTokens,
    chatOutputTokens: totalOutputTokens,
    costs: {
      embedding: parseFloat(embeddingCost.toFixed(6)),
      chatInput: parseFloat(chatInputCost.toFixed(6)),
      chatOutput: parseFloat(chatOutputCost.toFixed(6)),
      total: parseFloat(totalCost.toFixed(6)),
    },
    formatted: `Telemetry Cost Report:
- Embeddings: ${totalEmbeddingTokens.toLocaleString()} tokens ($${embeddingCost.toFixed(6)})
- Chat Input: ${totalInputTokens.toLocaleString()} tokens ($${chatInputCost.toFixed(6)})
- Chat Output: ${totalOutputTokens.toLocaleString()} tokens ($${chatOutputCost.toFixed(6)})
- Total Accumulated Cost: $${totalCost.toFixed(6)}`
  };
}

/**
 * Generates embeddings in batches of a given size
 * Supports up to 2048 inputs per batch, defaults to 100 as per spec
 */
export async function getEmbeddingsBatch(
  texts: string[],
  batchSize = 100
): Promise<number[][]> {
  const openai = getOpenAIClient();
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    
    // Clean and validate chunk inputs (ensure no empty strings)
    const sanitizedChunk = chunk.map(text => text.trim() === '' ? '[empty]' : text);

    try {
      const response = await openai.embeddings.create({
        model: EMBED_MODEL,
        input: sanitizedChunk,
      });

      // Track embedding token usage
      const promptTokens = response.usage.prompt_tokens;
      trackCost('embedding', { input: promptTokens });

      const sortedEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);

      embeddings.push(...sortedEmbeddings);
    } catch (error) {
      console.error(`Error generating embeddings batch from index ${i} to ${i + chunk.length}:`, error);
      throw error;
    }
  }

  return embeddings;
}

/**
 * Generate chat completion helper
 */
export async function getChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, 'model' | 'messages'> = {}
) {
  const openai = getOpenAIClient();

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      ...options,
    });

    if (response.usage) {
      trackCost('chat', {
        input: response.usage.prompt_tokens,
        output: response.usage.completion_tokens,
      });
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error in OpenAI Chat Completion:', error);
    throw error;
  }
}
