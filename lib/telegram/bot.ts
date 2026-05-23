import { Bot, InlineKeyboard } from 'grammy';
import { executeHybridSearch, SearchResult } from '../search/search';
import { extractTopFrequencies } from '../entities/frequency';
import { createSupabaseAdminClient } from '../supabase/admin';

// Initialize the Grammy bot
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.warn('[Telegram Bot Warning] TELEGRAM_BOT_TOKEN is missing. Instantiating bot with placeholder.');
}

// Instantiate bot securely
export const bot = new Bot(botToken || 'DUMMY_TOKEN_PLACEHOLDER');

// User language preference cache
const userLanguageCache = new Map<number, string>();

async function getUserLanguage(chatId: number): Promise<string> {
  const cached = userLanguageCache.get(chatId);
  if (cached) return cached;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('bot_user_preferences')
      .select('language_code')
      .eq('chat_id', chatId)
      .single();

    if (error || !data) {
      userLanguageCache.set(chatId, 'az');
      return 'az'; // Default to Azerbaijani
    }
    const lang = data.language_code || 'az';
    userLanguageCache.set(chatId, lang);
    return lang;
  } catch (err) {
    console.warn(`[Telegram Bot] Error fetching language preference for ${chatId}:`, err);
    return 'az';
  }
}

async function setUserLanguage(chatId: number, lang: string): Promise<boolean> {
  userLanguageCache.set(chatId, lang);
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from('bot_user_preferences')
      .upsert({
        chat_id: chatId,
        language_code: lang,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chat_id' });

    if (error) {
      console.error(`[Telegram Bot] Error updating language for ${chatId}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Telegram Bot] Error upserting language for ${chatId}:`, err);
    return false;
  }
}

const BOT_DICT: Record<string, Record<string, string>> = {
  az: {
    welcome: `🔍 <b>Sift — AI Xəbər İntellektinə xoş gəlmisiniz!</b>\n\n` +
             `Mən Sift, Neurotime hakatonu üçün hazırlanmış premium xəbər axtarış sistemiyəm. Mən ~20,915 çoxdilli məqalə (Azərbaycan, Rus, İngilis) üzərində semantik vektor və açar söz hibrid sıralamasından istifadə edərək təbii dildə axtarışları emal edirəm.\n\n` +
             `💬 <b>Necə axtarmaq olar:</b>\n` +
             `Mənə sadəcə təbii dildə yazın! Məsələn:\n` +
             `• <i>"AccessBank xəbərləri"</i>\n` +
             `• <i>"14 May tarixində SOCAR xəbərləri"</i>\n` +
             `• <i>"12 və 14 may tarixləri arasında bank xəbərləri"</i>\n` +
             `• <i>"vergilər haqqında iqtisadiyyat xəbərləri"</i>\n\n` +
             `Başlamaq üçün mənə hər hansı bir sorğu göndərin! Dilinizi dəyişmək üçün /lang yazın. 👇`,
    help: `🔍 <b>Sift Bot Bələdçisi</b>\n\n` +
          `• Mənə Azərbaycan, Rus və ya İngilis dillərində sorğular göndərə bilərsiniz.\n` +
          `• Süni intellekt vasitəsilə tarixləri və mövzuları dinamik şəkildə müəyyən edirəm.\n` +
          `• Nəticələr üzərindəki düymələrdən istifadə edərək səhifələyə (<i>Daha çox nəticə</i>) və ya əsas entityləri (<i>Top entitylər</i>) çıxara bilərsiniz.\n` +
          `• Dili dəyişmək üçün /lang əmrindən istifadə edin.`,
    sifting: '🔍 <i>Məlumat bazasında axtarış aparılır...</i>',
    no_results: `❌ <b>Məqalə tapılmadı</b>.\n\nMəsələn, <i>"SOCAR"</i>, <i>"bank"</i>, <i>"festival"</i> və ya <i>"iqtisadiyyat"</i> kimi anlayışları axtarmağa çalışın.`,
    top_results: `🏆 <b>Ən yaxşı xəbər nəticələri (1-5):</b>\n\n`,
    top_entities_btn: '🏷️ Top entitylər',
    more_results_btn: '📄 Daha çox nəticə',
    new_search_btn: '🔁 Yeni axtarış',
    search_prompt: '🔍 Axtarışa başlamaq üçün mənə hər hansı bir Azərbaycan, Rus və ya İngilis dilində sorğu göndərin!',
    extracting_entities: '🏷️ <i>"{query}" üçün əsas adlar çıxarılır...</i>',
    no_entities: '❌ Entity tapılmadı.',
    failed_entities: '❌ Proper-noun tokenizasiyası üçün məqalə məlumatlarını əldə etmək mümkün olmadı.',
    top_entities_title: `🏷️ <b>Nəticələrdə ən çox adı çəkilənlər:</b>\n\n`,
    mentions: 'dəfə çəkilib',
    retrieving_page: '📄 <i>Səhifə {page} yüklənir...</i>',
    end_of_results: '📄 <b>Nəticələrin sonu.</b> Yeni axtarış etmək üçün mənə mesaj yazın!',
    page_results: '📄 <b>Sıralanmış xəbər nəticələri (səhifə {page}):</b>\n\n',
    error: `⚠️ <b>Axtarış xətası</b>\nBazamız hazırda yüksək həcmdə sorğuları emal edir. Zəhmət olmasa bir az sonra yenidən cəhd edin.`,
    lang_prompt: '🌐 <b>Zəhmət olmasa bot üçün dil seçin:</b>\n\nChoose language for Sift Bot:\nВыберите язык для Sift Bot:',
    lang_success: '✅ <b>Dil uğurla dəyişdirildi!</b> İndi mənimlə Azərbaycan dilində axtarış edə bilərsiniz.',
  },
  en: {
    welcome: `🔍 <b>Welcome to Sift — AI News Intelligence!</b>\n\n` +
             `I am Sift, a premium news search engine built for the Neurotime hackathon. I process natural-language searches across ~20,915 multilingual articles (Azerbaijani, Russian, English) using semantic vector and keyword hybrid ranking.\n\n` +
             `💬 <b>How to search:</b>\n` +
             `Simply text me in plain language! For example:\n` +
             `• <i>"AccessBank news"</i>\n` +
             `• <i>"SOCAR news on May 14"</i>\n` +
             `• <i>"banking news between May 12 and May 14"</i>\n` +
             `• <i>"economy news about taxes"</i>\n\n` +
             `Send me any query to begin! Type /lang to change language. 👇`,
    help: `🔍 <b>Sift Bot Guide</b>\n\n` +
          `• Send me queries in Azerbaijani, Russian, or English.\n` +
          `• I interpret natural dates and topics dynamically using AI.\n` +
          `• Use the inline buttons on search results to paginate (<i>More results</i>) or extract key organizations and proper nouns in real-time (<i>Top entities</i>).\n` +
          `• Use /lang command to change the language preference.`,
    sifting: '🔍 <i>Sifting the news database...</i>',
    no_results: `❌ <b>No articles found</b> matching your query.\n\n` +
                `Try searching for concepts like <i>"SOCAR"</i>, <i>"banking"</i>, <i>"festival"</i>, or <i>"economy"</i>.`,
    top_results: `🏆 <b>Top ranked news results (1-5):</b>\n\n`,
    top_entities_btn: '🏷️ Top entities',
    more_results_btn: '📄 More results',
    new_search_btn: '🔁 New search',
    search_prompt: '🔍 Send me any Azerbaijani, Russian, or English text query to begin a new search!',
    extracting_entities: '🏷️ <i>Extracting top proper-nouns for "{query}"...</i>',
    no_entities: '❌ No articles found to extract entities from.',
    failed_entities: '❌ Failed to retrieve article details for proper-noun tokenization.',
    top_entities_title: `🏷️ <b>Top Entities in these results:</b>\n\n`,
    mentions: 'mentions',
    retrieving_page: '📄 <i>Retrieving page {page}...</i>',
    end_of_results: '📄 <b>End of results reached.</b> Send a new message to perform another search!',
    page_results: '📄 <b>Ranked news results (page {page}):</b>\n\n',
    error: `⚠️ <b>Search Timeout</b>\nOur database is currently processing high-volume requests. Please try again shortly.`,
    lang_prompt: '🌐 <b>Choose language for Sift Bot:</b>\n\nZəhmət olmasa bot üçün dil seçin:\nВыберите язык для Sift Bot:',
    lang_success: '✅ <b>Language updated successfully!</b> I will now respond in English.',
  },
  ru: {
    welcome: `🔍 <b>Добро пожаловать в Sift — AI Интеллект Новостей!</b>\n\n` +
             `Я Sift, премиальная поисковая система новостей, созданная для хакатона Neurotime. Я обрабатываю поисковые запросы на естественном языке по ~20,915 мультиязычным статьям (азербайджанский, русский, английский), используя гибридное ранжирование семантических векторов и ключевых слов.\n\n` +
             `💬 <b>Как искать:</b>\n` +
             `Просто напишите мне на обычном языке! Например:\n` +
             `• <i>"Новости AccessBank"</i>\n` +
             `• <i>"Новости SOCAR 14 мая"</i>\n` +
             `• <i>"банковские новости между 12 и 14 мая"</i>\n` +
             `• <i>"экономические новости о налогах"</i>\n\n` +
             `Отправьте мне любой запрос, чтобы начать! Введите /lang для смены языка. 👇`,
    help: `🔍 <b>Sift Bot Руководство</b>\n\n` +
          `• Отправляйте мне запросы на азербайджанском, русском или английском языках.\n` +
          `• Я динамически интерпретирую даты и темы с помощью AI.\n` +
          `• Используйте встроенные кнопки под результатами для переключения страниц (<i>Еще результаты</i>) или извлечения упомянутых сущностей (<i>Топ сущностей</i>).\n` +
          `• Используйте команду /lang, чтобы изменить настройки языка.`,
    sifting: '🔍 <i>Идет поиск в базе данных новостей...</i>',
    no_results: `❌ <b>Статьи не найдены</b>.\n\nПопробуйте поискать такие понятия, как <i>"SOCAR"</i>, <i>"банк"</i>, <i>"фестиваль"</i> или <i>"экономика"</i>.`,
    top_results: `🏆 <b>Лучшие результаты поиска (1-5):</b>\n\n`,
    top_entities_btn: '🏷️ Топ сущностей',
    more_results_btn: '📄 Еще результаты',
    new_search_btn: '🔁 Новая попытка',
    search_prompt: '🔍 Отправьте мне любой текстовый запрос на азербайджанском, русском или английском языках для начала поиска!',
    extracting_entities: '🏷️ <i>Извлечение ключевых сущностей для "{query}"...</i>',
    no_entities: '❌ Статьи для извлечения сущностей не найдены.',
    failed_entities: '❌ Не удалось загрузить статьи для извлечения сущностей.',
    top_entities_title: `🏷️ <b>Топ сущностей в этих результатах:</b>\n\n`,
    mentions: 'упоминаний',
    retrieving_page: '📄 <i>Загрузка страницы {page}...</i>',
    end_of_results: '📄 <b>Достигнут конец результатов.</b> Отправьте мне новое сообщение для запуска поиска!',
    page_results: '📄 <b>Результаты поиска (страница {page}):</b>\n\n',
    error: `⚠️ <b>Тайм-аут поиска</b>\nПожалуйста, попробуйте еще раз позже.`,
    lang_prompt: '🌐 <b>Выберите язык для Sift Bot:</b>\n\nZəhmət olmasa bot üçün dil seçin:\nChoose language for Sift Bot:',
    lang_success: '✅ <b>Язык успешно изменен!</b> Теперь я буду отвечать вам на русском языке.',
  }
};

function t(lang: string, key: string, replacements?: Record<string, string>): string {
  const dict = BOT_DICT[lang] || BOT_DICT['en'];
  let text = dict[key] || BOT_DICT['en'][key] || key;
  if (replacements) {
    Object.entries(replacements).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{${k}}`, 'g'), v);
    });
  }
  return text;
}

/**
 * Format individual article search hits as premium HTML news cards
 */
function formatArticleCard(art: SearchResult, lang: string): string {
  const publishedDate = new Date(art.published_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const domain = art.source || 'unknown';
  const l = (art.language || 'en').toUpperCase();
  const relevance = art.relevance_score || 0;

  // Clean raw HTML snippets if Excel contains formatting tags
  const cleanSnippet = art.content
    .replace(/<[^>]*>/g, '')
    .substring(0, 140) + '...';

  const relevanceLabel = lang === 'az' ? 'Relevanlıq' : lang === 'ru' ? 'Релевантность' : 'Relevance';

  return `🔹 <a href="${art.link}"><b>${art.title}</b></a>\n` +
         `   <code>${domain}</code> · <code>${l}</code> · <code>${publishedDate}</code> · <b>${relevanceLabel}: ${relevance}%</b>\n` +
         `   <i>${cleanSnippet}</i>\n`;
}

/**
 * Build conversational parsed tags summary
 */
function formatInterpretationBadge(interpretation: any, lang: string): string {
  const parts: string[] = [];
  if (interpretation.topic) parts.push(`🔍 ${interpretation.topic}`);
  
  if (interpretation.date_from || interpretation.date_to) {
    const fromStr = interpretation.date_from ? new Date(interpretation.date_from).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '';
    const toStr = interpretation.date_to ? new Date(interpretation.date_to).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '';
    parts.push(`📅 ${fromStr || 'Start'}-${toStr || 'End'}`);
  }
  
  if (interpretation.category_hint) parts.push(`📂 ${interpretation.category_hint}`);
  if (interpretation.source_hint) parts.push(`🎙️ ${interpretation.source_hint}`);

  const interpLabel = lang === 'az' ? 'Yozum' : lang === 'ru' ? 'Интерпретация' : 'Interpretation';

  return parts.length > 0 
    ? `⚡ <b>${interpLabel}:</b> ${parts.join(' · ')}\n\n`
    : '';
}

// 1. Listen for /start, /help, and /lang commands
bot.command('start', async (ctx) => {
  if (!ctx.chat) return;
  console.log(`[Bot API] /start command received from user: ${ctx.from?.username || ctx.from?.id}`);
  const lang = await getUserLanguage(ctx.chat.id);
  await ctx.reply(t(lang, 'welcome'), { parse_mode: 'HTML' });
});

bot.command('help', async (ctx) => {
  if (!ctx.chat) return;
  const lang = await getUserLanguage(ctx.chat.id);
  await ctx.reply(t(lang, 'help'), { parse_mode: 'HTML' });
});

bot.command('lang', async (ctx) => {
  if (!ctx.chat) return;
  const lang = await getUserLanguage(ctx.chat.id);
  
  const keyboard = new InlineKeyboard()
    .text('🇦🇿 Azərbaycan', 'setlang:az')
    .text('🇬🇧 English', 'setlang:en')
    .text('🇷🇺 Русский', 'setlang:ru');

  await ctx.reply(t(lang, 'lang_prompt'), {
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
});

// 2. Main Natural Language Search Handler
bot.on('message:text', async (ctx) => {
  if (!ctx.chat) return;
  const query = ctx.message.text.trim();
  
  // Ignore command strings to prevent command execution from triggering searches
  if (query.startsWith('/')) {
    return;
  }

  const userId = ctx.from?.id || 'unknown';
  console.log(`[Bot Search] Request: "${query}" from user: ${userId}`);

  const lang = await getUserLanguage(ctx.chat.id);
  const statusMsg = await ctx.reply(t(lang, 'sifting'), { parse_mode: 'HTML' });

  try {
    // Execute hybrid search (fetching top 15 results initially)
    const response = await executeHybridSearch(query, { limit: 15 });
    
    if (response.results.length === 0) {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
      await ctx.reply(t(lang, 'no_results'), { parse_mode: 'HTML' });
      return;
    }

    const interpretationBadge = formatInterpretationBadge(response.interpretation, lang);
    const top5 = response.results.slice(0, 5);

    let replyMessage = `${interpretationBadge}${t(lang, 'top_results')}`;
    top5.forEach((art) => {
      replyMessage += formatArticleCard(art, lang) + '\n';
    });

    const cleanQueryKey = query.substring(0, 40); // Cap query key safely

    const keyboard = new InlineKeyboard()
      .text(t(lang, 'top_entities_btn'), `ents:${cleanQueryKey}`)
      .text(t(lang, 'more_results_btn'), `more:1:${cleanQueryKey}`)
      .row()
      .text(t(lang, 'new_search_btn'), 'new');

    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    await ctx.reply(replyMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true }
    });

  } catch (err: any) {
    console.error('[Bot Search Exception]', err);
    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
    await ctx.reply(t(lang, 'error'), { parse_mode: 'HTML' });
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

  const lang = await getUserLanguage(ctx.chat.id);

  try {
    // Language selection callback handler
    if (callbackData.startsWith('setlang:')) {
      const selectedLang = callbackData.split(':')[1];
      await setUserLanguage(ctx.chat.id, selectedLang);
      
      const successMsg = t(selectedLang, 'lang_success');
      await ctx.reply(successMsg, { parse_mode: 'HTML' });
      return;
    }

    if (callbackData === 'new') {
      await ctx.reply(t(lang, 'search_prompt'));
      return;
    }

    // A. Top Entities Live-tokenization callback (format: ents:<query>)
    if (callbackData.startsWith('ents:')) {
      const targetQuery = callbackData.substring(5);
      const statusMsg = await ctx.reply(t(lang, 'extracting_entities', { query: targetQuery }), { parse_mode: 'HTML' });

      // Retrieve full results
      const response = await executeHybridSearch(targetQuery, { limit: 15 });
      
      if (response.results.length === 0) {
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
        await ctx.reply(t(lang, 'no_entities'));
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
        await ctx.reply(t(lang, 'failed_entities'));
        return;
      }

      // Live tokenize in under 10ms
      const frequencies = extractTopFrequencies(articles, 8);

      let entitiesMsg = t(lang, 'top_entities_title');
      if (frequencies.length === 0) {
        entitiesMsg += lang === 'az' ? '<i>Heç bir ad müəyyən edilmədi.</i>' : lang === 'ru' ? '<i>Не удалось извлечь сущности.</i>' : '<i>No proper nouns could be isolated from this result set.</i>';
      } else {
        frequencies.forEach((ent, i) => {
          entitiesMsg += `<b>${i + 1}. ${ent.term}</b> — <code>${ent.count} ${t(lang, 'mentions')}</code>\n`;
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

      const statusMsg = await ctx.reply(t(lang, 'retrieving_page', { page: String(page + 1) }), { parse_mode: 'HTML' });

      // Retrieve results
      const response = await executeHybridSearch(targetQuery, { limit: 15 });
      
      const startIdx = page * 5;
      const endIdx = startIdx + 5;
      const nextSlice = response.results.slice(startIdx, endIdx);

      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});

      if (nextSlice.length === 0) {
        await ctx.reply(t(lang, 'end_of_results'));
        return;
      }

      let replyMessage = t(lang, 'page_results', { page: String(page + 1) });
      nextSlice.forEach((art) => {
        replyMessage += formatArticleCard(art, lang) + '\n';
      });

      // Construct next pagination inline key
      const nextKeyboard = new InlineKeyboard()
        .text(t(lang, 'top_entities_btn'), `ents:${targetQuery}`)
        .text(t(lang, 'more_results_btn'), `more:${page + 1}:${targetQuery}`)
        .row()
        .text(t(lang, 'new_search_btn'), 'new');

      await ctx.reply(replyMessage, {
        parse_mode: 'HTML',
        reply_markup: nextKeyboard,
        link_preview_options: { is_disabled: true }
      });
      return;
    }

  } catch (err: any) {
    console.error('[Bot Callback Query Error]', err);
    await ctx.reply(t(lang, 'error'), { parse_mode: 'HTML' });
  }
});

