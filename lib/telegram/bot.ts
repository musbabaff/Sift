import { Bot, InlineKeyboard } from 'grammy';
import { executeHybridSearch, SearchResult } from '../search/search';
import { extractTopFrequencies } from '../entities/frequency';
import { createSupabaseAdminClient } from '../supabase/admin';

// Initialize the Grammy bot
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  // Graceful fallback dummy token to prevent Next.js build-time errors if token is missing
  console.warn('[Telegram Bot Warning] TELEGRAM_BOT_TOKEN is missing. Instantiating bot with placeholder.');
}

// Instantiate bot securely
export const bot = new Bot(botToken || 'DUMMY_TOKEN_PLACEHOLDER');

/**
 * Format individual article search hits as premium HTML news cards
 */
function formatArticleCard(art: SearchResult): string {
  const publishedDate = new Date(art.published_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const domain = art.source || 'unknown';
  const lang = (art.language || 'en').toUpperCase();
  const relevance = art.relevance_score || 0;

  // Clean raw HTML snippets if Excel contains formatting tags
  const cleanSnippet = art.content
    .replace(/<[^>]*>/g, '')
    .substring(0, 140) + '...';

  return `🔹 <a href="${art.link}"><b>${art.title}</b></a>\n` +
         `   <code>${domain}</code> · <code>${lang}</code> · <code>${publishedDate}</code> · <b>Relevance: ${relevance}%</b>\n` +
         `   <i>${cleanSnippet}</i>\n`;
}

/**
 * Build conversational parsed tags summary
 */
function formatInterpretationBadge(interpretation: any): string {
  const parts: string[] = [];
  if (interpretation.topic) parts.push(`🔍 ${interpretation.topic}`);
  
  if (interpretation.date_from || interpretation.date_to) {
    const fromStr = interpretation.date_from ? new Date(interpretation.date_from).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '';
    const toStr = interpretation.date_to ? new Date(interpretation.date_to).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '';
    parts.push(`📅 ${fromStr || 'Start'}-${toStr || 'End'}`);
  }
  
  if (interpretation.category_hint) parts.push(`📂 ${interpretation.category_hint}`);
  if (interpretation.source_hint) parts.push(`🎙️ ${interpretation.source_hint}`);

  return parts.length > 0 
    ? `⚡ <b>Interpretation:</b> ${parts.join(' · ')}\n\n`
    : '';
}

// 1. Listen for /start and /help commands
bot.command('start', async (ctx) => {
  console.log(`[Bot API] /start command received from user: ${ctx.from?.username || ctx.from?.id}`);
  
  const welcomeText = 
    `🔍 <b>Welcome to Sift — AI News Intelligence!</b>\n\n` +
    `I am Sift, a premium news search engine built for the Neurotime hackathon. I process natural-language searches across ~20,915 multilingual articles ( Azerbaijani, Russian, English) using semantic vector and keyword hybrid ranking.\n\n` +
    `💬 <b>How to search:</b>\n` +
    `Simply text me in plain language! For example:\n` +
    `• <i>"AccessBank news"</i>\n` +
    `• <i>"SOCAR news on May 14"</i>\n` +
    `• <i>"banking news between May 12 and May 14"</i>\n` +
    `• <i>"economy news about taxes"</i>\n\n` +
    `Send me any query to begin! 👇`;

  await ctx.reply(welcomeText, { parse_mode: 'HTML' });
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `🔍 <b>Sift Bot Guide</b>\n\n` +
    `• Send me queries in Azerbaijani, Russian, or English.\n` +
    `• Avoid rigid syntax; I interpret natural dates and topics dynamically using AI.\n` +
    `• Use the inline buttons on search results to paginate (<i>More results</i>) or extract key organizations and proper nouns in real-time (<i>Top entities</i>).`,
    { parse_mode: 'HTML' }
  );
});

// 2. Main Natural Language Search Handler
bot.on('message:text', async (ctx) => {
  if (!ctx.chat) return;
  const query = ctx.message.text.trim();
  const userId = ctx.from?.id || 'unknown';
  console.log(`[Bot Search] Request: "${query}" from user: ${userId}`);

  const statusMsg = await ctx.reply('🔍 <i>Sifting the news database...</i>', { parse_mode: 'HTML' });

  try {
    // Execute hybrid search (fetching top 15 results initially)
    const response = await executeHybridSearch(query, { limit: 15 });
    
    if (response.results.length === 0) {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
      await ctx.reply(
        `❌ <b>No articles found</b> matching your query.\n\n` +
        `Try searching for concepts like <i>"SOCAR"</i>, <i>"banking"</i>, <i>"festival"</i>, or <i>"economy"</i>.`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    const interpretationBadge = formatInterpretationBadge(response.interpretation);
    const top5 = response.results.slice(0, 5);

    let replyMessage = `${interpretationBadge}🏆 <b>Top ranked news results (1-5):</b>\n\n`;
    top5.forEach((art) => {
      replyMessage += formatArticleCard(art) + '\n';
    });

    // Create Sift Cyber Inline Keyboard
    const cleanQueryKey = query.substring(0, 40); // Cap query key safely

    const keyboard = new InlineKeyboard()
      .text('🏷️ Top entities', `ents:${cleanQueryKey}`)
      .text('📄 More results', `more:1:${cleanQueryKey}`)
      .row()
      .text('🔁 New search', 'new');

    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    await ctx.reply(replyMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true }
    });

  } catch (err: any) {
    console.error('[Bot Search Exception]', err);
    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
    await ctx.reply(
      `⚠️ <b>Search Timeout</b>\n` +
      `Our database is currently processing high-volume requests. Please run the HNSW re-indexing migration in your Supabase Editor or simplify your search range.`,
      { parse_mode: 'HTML' }
    );
  }
});

// 3. Inline Keyboard Action Callback Listeners
bot.on('callback_query:data', async (ctx) => {
  if (!ctx.chat) {
    console.warn('[Bot Callback] Received callback without an associated chat context.');
    return;
  }
  const callbackData = ctx.callbackQuery.data;
  const userId = ctx.from?.id || 'unknown';
  console.log(`[Bot Callback] Received trigger: "${callbackData}" from user: ${userId}`);

  // Confirm receipt to avoid button loading spinner
  await ctx.answerCallbackQuery();

  try {
    if (callbackData === 'new') {
      await ctx.reply('🔍 Send me any Azerbaijani, Russian, or English text query to begin a new search!');
      return;
    }

    // A. Top Entities Live-tokenization callback (format: ents:<query>)
    if (callbackData.startsWith('ents:')) {
      const targetQuery = callbackData.substring(5);
      const statusMsg = await ctx.reply(`🏷️ <i>Extracting top proper-nouns for "${targetQuery}"...</i>`, { parse_mode: 'HTML' });

      // Retrieve full results
      const response = await executeHybridSearch(targetQuery, { limit: 15 });
      
      if (response.results.length === 0) {
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
        await ctx.reply('❌ No articles found to extract entities from.');
        return;
      }

      const supabase = createSupabaseAdminClient();
      const articleIds = response.results.map(r => r.id);

      // Fetch textual contents to tokenize
      const { data: articles, error } = await supabase
        .from('articles')
        .select('title, content')
        .in('id', articleIds);

      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});

      if (error || !articles || articles.length === 0) {
        await ctx.reply('❌ Failed to retrieve article details for proper-noun tokenization.');
        return;
      }

      // Live tokenize in under 10ms
      const frequencies = extractTopFrequencies(articles, 8);

      let entitiesMsg = `🏷️ <b>Top Entities in these results:</b>\n\n`;
      if (frequencies.length === 0) {
        entitiesMsg += `<i>No proper nouns could be isolated from this result set. Stopwords successfully filtered.</i>`;
      } else {
        frequencies.forEach((ent, i) => {
          entitiesMsg += `<b>${i + 1}. ${ent.term}</b> — <code>${ent.count} mentions</code>\n`;
        });
      }

      await ctx.reply(entitiesMsg, { parse_mode: 'HTML' });
      return;
    }

    // B. Pagination More Results callback (format: more:<page>:<query>)
    if (callbackData.startsWith('more:')) {
      const parts = callbackData.split(':');
      const page = parseInt(parts[1], 10);
      const targetQuery = parts.slice(2).join(':');

      const statusMsg = await ctx.reply(`📄 <i>Retrieving page ${page + 1}...</i>`, { parse_mode: 'HTML' });

      // Retrieve results
      const response = await executeHybridSearch(targetQuery, { limit: 15 });
      
      const startIdx = page * 5;
      const endIdx = startIdx + 5;
      const nextSlice = response.results.slice(startIdx, endIdx);

      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});

      if (nextSlice.length === 0) {
        await ctx.reply('📄 <b>End of results reached.</b> Send a new message to perform another search!');
        return;
      }

      let replyMessage = `📄 <b>Ranked news results (page ${page + 1}):</b>\n\n`;
      nextSlice.forEach((art) => {
        replyMessage += formatArticleCard(art) + '\n';
      });

      // Construct next pagination inline key
      const nextKeyboard = new InlineKeyboard()
        .text('🏷️ Top entities', `ents:${targetQuery}`)
        .text('📄 More results', `more:${page + 1}:${targetQuery}`)
        .row()
        .text('🔁 New search', 'new');

      await ctx.reply(replyMessage, {
        parse_mode: 'HTML',
        reply_markup: nextKeyboard,
        link_preview_options: { is_disabled: true }
      });
      return;
    }

  } catch (err: any) {
    console.error('[Bot Callback Query Error]', err);
    await ctx.reply('⚠️ An error occurred while executing this action. Please submit a new search text query.');
  }
});
