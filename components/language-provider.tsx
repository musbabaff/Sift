'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'az' | 'en' | 'ru';

export const DICTIONARIES: Record<Language, Record<string, string>> = {
  az: {
    // Header Navigation
    'nav_search': 'Axtarış',
    'nav_insights': 'Analitika',
    'nav_bot': 'Bot',
    'header_docs_meta': '20,915 sənəd · 10–15 May',

    // Hero Section
    'hero_eyebrow': 'Axtar · Analiz et · Süzgəcdən keçir',
    'hero_title_1': 'Xəbər səs-küyündən ',
    'hero_title_em': 'siqnalı',
    'hero_title_2': ' ayırın.',
    'hero_sub': 'Azərbaycan, rus və ingilis dillərində 20,915 xəbər məqaləsi (10–15 May, 2026) üzrə hibrid semantik axtarış.',

    // Search Input
    'search_placeholder': 'Məsələn: "AccessBank xəbərləri", "SOCAR news on May 14"...',
    'search_btn': 'Axtar',
    'searching_btn': 'Axtarılır...',
    'try_query': 'Sorğu yoxlayın',
    'trending_corpus': 'Korpusda populyar olanlar',

    // Interpretation
    'sift_understood': 'Sift anladı',
    'semantic_matching_desc': 'Korpus üzrə semantik uyğunlaşdırma və entity filtrlənməsi.',
    
    // Search Results Bar
    'results': 'nəticə',
    'ranked_in': 'sıralandı',
    'download_csv': 'CSV',
    'relevance': 'Uyğunluq',
    'looking_for_insights': 'Analitika bölməsinə baxmaq istəyirsiniz?',
    'open_insights': 'Analitikanı Aç',

    // Telemetry
    'telemetry_db': 'DB',
    'telemetry_parse': 'AI Analiz',
    'telemetry_cost': 'Təxmini xərc',

    // Empty States / Errors
    'search_failed': 'Axtarış alınmadı',
    'did_you_mean': 'Bunu nəzərdə tuturdunuz:',
    'recently_surfaced': 'Son tapılanlar',
    'what_corpus_talks': 'Korpusda ən çox danışılan mövzular',
    'loading_recent': 'Verilənlər bazasından son məqalələr yüklənir...',
    'no_results_found': 'Nəticə tapılmadı',
    'no_results_desc': 'Sift korpusu yoxladı, lakin "{query}" üçün uyğun nəticə tapmadı. Axtarış sözlərini sadələşdirməyi yoxlayın.',
    'clear_search': 'Axtarışı təmizlə',

    // Sidebar (ResultsRail)
    'live_analytics': 'Canlı analitika',
    'on_this_query': 'Bu sorğu üzrə',
    'corpus_overview': 'Korpusa baxış',
    'category_mix': 'Kateqoriya qarışığı',
    'categories_count': 'kateqoriya',
    'top_sources': 'Ən çox istifadə olunan mənbələr',
    'languages': 'Dillər',
    'intelligence_feed': 'İntellektual Axın',
    'in_results': 'Nəticələrdə',
    'all_news': 'Bütün xəbərlər',
    'no_entities': 'Heç bir entity tapılmadı',
    'awaiting_queries': 'Sorğular üzrə canlı analiz gözlənilir.',
    'precomputations_loading': 'Analitika yüklənir.',
    'tip_click_badge': 'İpucu: İstənilən nişana klikləyərək axtarışı süzgəcdən keçirin.',
    'refine_operators': 'Operatorlarla dəqiqləşdirin',
    'refine_tip': 'Kimi filtrləri yoxlayın: ',

    // Insights Page
    'entity_intelligence': 'Entity İntellekti',
    'insights_title_1': 'Xəbərlərdə ',
    'insights_title_em': 'kimlərdən və nələrdən',
    'insights_title_2': ' danışılır.',
    'insights_sub': '10–15 May 2026-cı il tarixləri arasında dərc olunmuş 20,915 Azərbaycan, rus və ingilis dilli məqalədən çıxarılmış entity-lər. Semantik axtarışa başlamaq üçün hər hansı karta klikləyin.',
    'stat_entities': 'entity',
    'stat_organizations': 'təşkilat',
    'stat_key_figures': 'əsas şəxslər',
    'most_mentioned': 'Ən çox adı çəkilən',
    'filter_all': 'Bütün entity-lər',
    'filter_orgs': 'Təşkilatlar',
    'filter_persons': 'Şəxslər',
    'filter_locations': 'Məkanlar',
    'filter_topics': 'Mövzular',
    'filter_placeholder': 'Entity-ləri süzgəcdən keçir...',
    'sort_by': 'Sıralama: ',
    'sort_mentions': 'Ad çəkilmə',
    'sort_trending': 'Trending',
    'sort_abc': 'A–Z',
    'db_error_title': 'Verilənlər Bazası Sorğusu Dayandırıldı',
    'db_error_desc': 'Zəhmət olmasa Supabase-də entity_stats cədvəlini yaratdığınızdan və npx tsx scripts/compute-entities.ts əmri ilə doldurduğunuzdan əmin olun.',
    'no_entities_matched': 'Kriteriyalara uyğun heç bir entity tapılmadı.',
    'org_label': 'Təşkilat / İdarə',
    'person_label': 'Şəxsiyyət',
    'location_label': 'Coğrafi məkan',
    'topic_label': 'Mövzu / Açar söz',
    'mentions_unit': 'dəfə çəkilib',
    'search_about_entity': 'haqqında xəbərləri axtar',

    // AI Summary
    'ai_summary_title': 'Sift AI Xülasəsi',
    'token_topic': 'Mövzu',
    'token_sentiment': 'Rəy',
    'sentiment_positive': 'Müsbət',
    'sentiment_negative': 'Mənfi',
    'sentiment_neutral': 'Neytral',

    // Bot Simulator Page
    'bot_eyebrow': 'İnteraktiv Telegram Bot Simulyatoru',
    'bot_title': 'Sift-i yolda yoxlayın.',
    'bot_desc': 'Süni intellekt analitikasını birbaşa messencerinizdə yoxlamaq üçün Grammy ilə işləyən Telegram botumuzu sınaqdan keçirin.',
    'bot_sim_sub': 'Hibrid xəbər axtarışı · 20,915 məqalə · AZ / RU / EN',
    'bot_sim_welcome': 'Sift AI Xəbər İntellektinə xoş gəlmisiniz.',
    'bot_sim_welcome_desc': 'İstənilən axtarış sorğusunu təbii Azərbaycan, ingilis və ya rus dilində daxil edin. Ən uyğun xəbərləri mənbələr, tarixlər və real hibrid xallarla qaytaracağam.',
    'bot_sim_welcome_tip': 'İpucu: Sorğuya tarix aralığı və ya entity əlavə edin — məs. "14 May tarixində SOCAR xəbərləri".',
    'bot_sim_query': '14 May tarixində SOCAR xəbərləri',
    'bot_sim_interp_topic': 'Mövzu',
    'bot_sim_interp_date': 'Tarix',
    'bot_sim_interp_lang': 'Dil',
    'bot_sim_interp_explain': '20,915 məqalə axtarılır...',
    'bot_sim_card1_date': '14 May',
    'bot_sim_card1_title': 'SOCAR Türkiyədə yeni neft-kimya kompleksinin inşasına başladı',
    'bot_sim_card1_summary': 'Petkim sahəsində 4.2 milyard dollarlıq genişlənmə layihəsinin təməlqoyma mərasimi keçirilib. Tikinti işləri 2029-cu ilədək tamamlanacaq.',
    'bot_sim_card1_kind': 'Dəqiq',
    'bot_sim_card1_kindnote': 'Dəqiq mövzu · Tarix uyğunluğu',
    'bot_sim_card2_date': '11 May',
    'bot_sim_card2_title': 'Azərbaycanın Avropaya qaz ixracı apreldə illik müqayisədə 12% artıb',
    'bot_sim_card2_summary': 'SOCAR göstəricilərinə əsasən, TAP vasitəsilə nəql edilən boru kəməri həcmləri İtaliya və Bolqarıstanın tələbi ilə rekord həddə - 2.4 milyard kubmetrə çatıb.',
    'bot_sim_card2_kind': 'Semantik',
    'bot_sim_card2_kindnote': 'SOCAR ilə əlaqəli · Qaz ixracı',
    'bot_features_nlp_title': 'Təbii Dil Axtarışları (Conversational NLP)',
    'bot_features_nlp_desc': 'Ciddi sintaksis qaydaları olmadan sadə sorğuları (AZ/RU/EN) yazın.',
    'bot_features_cards_title': 'Premium HTML Cavab Kartları',
    'bot_features_cards_desc': 'Təmiz, kliklənən başlıqlar, mənbə etiketləri və dəqiq hibrid xal nişanları.',
    'bot_features_paging_title': 'Vəziyyətsiz Səhifələmə Düymələri',
    'bot_features_paging_desc': 'Optimallaşdırılmış dynamic callback-lər vasitəsilə nəticələr arasında dinamik səhifələyin.',
    'bot_open_btn': 'Aç: @SiftNBot',
    'bot_replay_btn': 'Demosunu təkrarla',
    'tg_online': 'bot · onlayn',
    'tg_today': 'Bu gün',
    'tg_message_placeholder': 'Mesaj',
    'tg_open_link': 'Linki Aç',
    'tg_share': 'Paylaş',
  },
  en: {
    // Header Navigation
    'nav_search': 'Search',
    'nav_insights': 'Insights',
    'nav_bot': 'Bot',
    'header_docs_meta': '20,915 docs · May 10–15',

    // Hero Section
    'hero_eyebrow': 'Search · Analyze · Sift',
    'hero_title_1': 'Sift the ',
    'hero_title_em': 'signal',
    'hero_title_2': ' from the noise.',
    'hero_sub': 'Hybrid semantic search across 20,915 Azerbaijani, Russian and English news articles (May 10–15, 2026).',

    // Search Input
    'search_placeholder': 'Try: "AccessBank news", "SOCAR news on May 14"...',
    'search_btn': 'Search',
    'searching_btn': 'Searching...',
    'try_query': 'Try a query',
    'trending_corpus': 'Trending in the corpus',

    // Interpretation
    'sift_understood': 'Sift understood',
    'semantic_matching_desc': 'Semantic matching & entity-filtering across the corpus.',

    // Search Results Bar
    'results': 'results',
    'ranked_in': 'ranked in',
    'download_csv': 'CSV',
    'relevance': 'Relevance',
    'looking_for_insights': 'Looking for insights instead?',
    'open_insights': 'Open Insights',

    // Telemetry
    'telemetry_db': 'DB',
    'telemetry_parse': 'AI Parse',
    'telemetry_cost': 'Est. Cost',

    // Empty States / Errors
    'search_failed': 'Search Retrieval Failed',
    'did_you_mean': 'Did you mean:',
    'recently_surfaced': 'Recently surfaced',
    'what_corpus_talks': 'What the corpus has been talking about',
    'loading_recent': 'Loading recent articles from the database...',
    'no_results_found': 'No results found',
    'no_results_desc': 'Sift scanned the corpus but couldn\'t find matches for "{query}". Try refining your search terms.',
    'clear_search': 'Clear search',

    // Sidebar (ResultsRail)
    'live_analytics': 'Live analytics',
    'on_this_query': 'On this query',
    'corpus_overview': 'Corpus overview',
    'category_mix': 'Category mix',
    'categories_count': 'categories',
    'top_sources': 'Top sources',
    'languages': 'Languages',
    'intelligence_feed': 'Intelligence Feed',
    'in_results': 'In results',
    'all_news': 'All news',
    'no_entities': 'No entities extracted',
    'awaiting_queries': 'Awaiting active queries to live tokenize.',
    'precomputations_loading': 'Precomputations are loading.',
    'tip_click_badge': 'Tip: Click any badge to filter queries instantly.',
    'refine_operators': 'Refine with operators',
    'refine_tip': 'Try filters like ',

    // Insights Page
    'entity_intelligence': 'Entity Intelligence',
    'insights_title_1': 'Who & what the news has been ',
    'insights_title_em': 'about',
    'insights_title_2': '.',
    'insights_sub': 'Sift isolated named entities from our corpus of 20,915 Azerbaijani, Russian, and English articles published between May 10–15, 2026. Click any card to launch a semantic search.',
    'stat_entities': 'entities',
    'stat_organizations': 'organizations',
    'stat_key_figures': 'key figures',
    'most_mentioned': 'Most mentioned',
    'filter_all': 'All entities',
    'filter_orgs': 'Organizations',
    'filter_persons': 'Key figures',
    'filter_locations': 'Locations',
    'filter_topics': 'Topics',
    'filter_placeholder': 'Filter entities…',
    'sort_by': 'Sort: ',
    'sort_mentions': 'Mentions',
    'sort_trending': 'Trending',
    'sort_abc': 'A–Z',
    'db_error_title': 'Database Query Interrupted',
    'db_error_desc': 'Please make sure you have created the entity_stats table in your Supabase SQL Editor and populated it using npx tsx scripts/compute-entities.ts.',
    'no_entities_matched': 'No entities matched your criteria.',
    'org_label': 'Organization / Agency',
    'person_label': 'Person',
    'location_label': 'Location',
    'topic_label': 'Topic / Keyword',
    'mentions_unit': 'mentions',
    'search_about_entity': 'Search news about',

    // AI Summary
    'ai_summary_title': 'Sift AI Brief',
    'token_topic': 'Topic',
    'token_sentiment': 'Sentiment',
    'sentiment_positive': 'Positive',
    'sentiment_negative': 'Negative',
    'sentiment_neutral': 'Neutral',

    // Bot Simulator Page
    'bot_eyebrow': 'Interactive Telegram Bot Simulator',
    'bot_title': 'Query Sift on the go.',
    'bot_desc': 'Try our Grammy-powered Telegram bot to experience AI-driven intelligence directly in your messenger.',
    'bot_sim_sub': 'Hybrid news search · 20,915 articles · AZ / RU / EN',
    'bot_sim_welcome': 'Welcome to Sift AI News Intelligence.',
    'bot_sim_welcome_desc': 'Type any search request in plain English, Azerbaijani or Russian. I’ll return the most relevant news with sources, dates and real-time hybrid scores.',
    'bot_sim_welcome_tip': 'Tip: include a date range or entity — e.g. “SOCAR news on May 14”.',
    'bot_sim_query': 'SOCAR news on May 14',
    'bot_sim_interp_topic': 'Topic',
    'bot_sim_interp_date': 'Date',
    'bot_sim_interp_lang': 'Lang',
    'bot_sim_interp_explain': 'Searching 20,915 articles...',
    'bot_sim_card1_date': 'May 14',
    'bot_sim_card1_title': 'SOCAR Türkiyədə yeni neft-kimya kompleksinin inşasına başladı',
    'bot_sim_card1_summary': 'Petkim sahəsində 4.2 milyard dollarlıq genişlənmə layihəsinin təməlqoyma mərasimi keçirilib. Tikinti işləri 2029-cu ilədək tamamlanacaq.',
    'bot_sim_card1_kind': 'Exact',
    'bot_sim_card1_kindnote': 'Exact mention · Date match',
    'bot_sim_card2_date': 'May 11',
    'bot_sim_card2_title': 'Azerbaijani gas exports to Europe rose 12% YoY in April',
    'bot_sim_card2_summary': 'Pipeline volumes via TAP reached a record 2.4 bcm, supported by Italian and Bulgarian demand, according to SOCAR figures.',
    'bot_sim_card2_kind': 'Semantic',
    'bot_sim_card2_kindnote': 'SOCAR-related · gas exports',
    'bot_features_nlp_title': 'Natural Language Queries (Conversational NLP)',
    'bot_features_nlp_desc': 'Type simple queries (AZ/RU/EN) like "SOCAR news on May 14" without strict syntax rules.',
    'bot_features_cards_title': 'Premium HTML Response Cards',
    'bot_features_cards_desc': 'Delivers clean, clickable headers, source labels, and precise hybrid score badges.',
    'bot_features_paging_title': 'Stateless Pagination Buttons',
    'bot_features_paging_desc': 'Page through results dynamically using optimized under-64-byte callbacks.',
    'bot_open_btn': 'Open @SiftNBot',
    'bot_replay_btn': 'Replay demo',
    'tg_online': 'bot · online',
    'tg_today': 'Today',
    'tg_message_placeholder': 'Message',
    'tg_open_link': 'Open Link',
    'tg_share': 'Share',
  },
  ru: {
    // Header Navigation
    'nav_search': 'Поиск',
    'nav_insights': 'Аналитика',
    'nav_bot': 'Бот',
    'header_docs_meta': '20,915 док · 10–15 мая',

    // Hero Section
    'hero_eyebrow': 'Ищи · Анализируй · Отсеивай',
    'hero_title_1': 'Отсеивай ',
    'hero_title_em': 'сигнал',
    'hero_title_2': ' от шума.',
    'hero_sub': 'Гибридный семантический поиск по 20,915 новостным статьям на азербайджанском, русском и английском языках (10–15 мая 2026 г.).',

    // Search Input
    'search_placeholder': 'Например: "AccessBank xəbərləri", "SOCAR news on May 14"...',
    'search_btn': 'Поиск',
    'searching_btn': 'Поиск...',
    'try_query': 'Попробуйте запрос',
    'trending_corpus': 'Популярно в корпусе',

    // Interpretation
    'sift_understood': 'Sift понял',
    'semantic_matching_desc': 'Семантическое соответствие и фильтрация сущностей по корпусу.',

    // Search Results Bar
    'results': 'результатов',
    'ranked_in': 'ранжировано за',
    'download_csv': 'CSV',
    'relevance': 'Релевантность',
    'looking_for_insights': 'Ищете аналитику?',
    'open_insights': 'Открыть аналитику',

    // Telemetry
    'telemetry_db': 'БД',
    'telemetry_parse': 'AI Анализ',
    'telemetry_cost': 'Ист. Стоимость',

    // Empty States / Errors
    'search_failed': 'Ошибка поиска',
    'did_you_mean': 'Возможно, вы имели в виду:',
    'recently_surfaced': 'Недавно обнаруженные',
    'what_corpus_talks': 'О чем говорят в корпусе',
    'loading_recent': 'Загрузка последних статей из базы данных...',
    'no_results_found': 'Ничего не найдено',
    'no_results_desc': 'Sift сканировал корпус, но не нашел совпадений для "{query}". Попробуйте упростить условия поиска.',
    'clear_search': 'Очистить поиск',

    // Sidebar (ResultsRail)
    'live_analytics': 'Живая аналитика',
    'on_this_query': 'По этому запросу',
    'corpus_overview': 'Обзор корпуса',
    'category_mix': 'Категории',
    'categories_count': 'категорий',
    'top_sources': 'Популярные источники',
    'languages': 'Языки',
    'intelligence_feed': 'Лента сущностей',
    'in_results': 'В результатах',
    'all_news': 'Все новости',
    'no_entities': 'Сущности не найдены',
    'awaiting_queries': 'Ожидание активных запросов для токенизации.',
    'precomputations_loading': 'Загрузка предварительных вычислений.',
    'tip_click_badge': 'Совет: Нажмите на тег для быстрой фильтрации.',
    'refine_operators': 'Уточняйте операторами',
    'refine_tip': 'Попробуйте фильтры: ',

    // Insights Page
    'entity_intelligence': 'Анализ сущностей',
    'insights_title_1': 'О ком и о чем говорят в ',
    'insights_title_em': 'новостях',
    'insights_title_2': '.',
    'insights_sub': 'Сущности, выделенные из нашего корпуса из 20,915 азербайджанских, русских и английских статей, опубликованных в период с 10 по 15 мая 2026 года. Нажмите на любую карточку, чтобы запустить семантический поиск.',
    'stat_entities': 'сущностей',
    'stat_organizations': 'организаций',
    'stat_key_figures': 'персон',
    'most_mentioned': 'Упоминаемые',
    'filter_all': 'Все сущности',
    'filter_orgs': 'Организации',
    'filter_persons': 'Персоны',
    'filter_locations': 'Локации',
    'filter_topics': 'Темы',
    'filter_placeholder': 'Фильтр сущностей…',
    'sort_by': 'Сортировка: ',
    'sort_mentions': 'Упоминания',
    'sort_trending': 'Тренды',
    'sort_abc': 'А–Я',
    'db_error_title': 'Запрос к базе данных прерван',
    'db_error_desc': 'Пожалуйста, убедитесь, что вы создали таблицу entity_stats в Supabase SQL Editor и заполнили ее с помощью npx tsx scripts/compute-entities.ts.',
    'no_entities_matched': 'Нет сущностей, соответствующих критериям.',
    'org_label': 'Организация / Ведомство',
    'person_label': 'Персона',
    'location_label': 'Гео-локация',
    'topic_label': 'Тема / Ключевое слово',
    'mentions_unit': 'упоминаний',
    'search_about_entity': 'Искать новости о',

    // AI Summary
    'ai_summary_title': 'Аналитическая сводка Sift',
    'token_topic': 'Тема',
    'token_sentiment': 'Тональность',
    'sentiment_positive': 'Позитивный',
    'sentiment_negative': 'Негативный',
    'sentiment_neutral': 'Нейтральный',

    // Bot Simulator Page
    'bot_eyebrow': 'Интерактивный симулятор Telegram-бота',
    'bot_title': 'Используйте Sift на ходу.',
    'bot_desc': 'Попробуйте нашего Telegram-бота на базе Grammy, чтобы получать аналитику прямо в вашем мессенджере.',
    'bot_sim_sub': 'Гибридный поиск новостей · 20,915 статей · AZ / RU / EN',
    'bot_sim_welcome': 'Добро пожаловать в Sift AI Интеллект Новостей.',
    'bot_sim_welcome_desc': 'Введите любой поисковый запрос на простом русском, азербайджанском или английском языках. Я верну наиболее релевантные новости с источниками, датами и гибридными оценками.',
    'bot_sim_welcome_tip': 'Совет: укажите диапазон дат или сущность — например, «Новости SOCAR за 14 мая».',
    'bot_sim_query': 'Новости SOCAR за 14 мая',
    'bot_sim_interp_topic': 'Тема',
    'bot_sim_interp_date': 'Дата',
    'bot_sim_interp_lang': 'Язык',
    'bot_sim_interp_explain': 'Поиск по 20,915 статьям...',
    'bot_sim_card1_date': '14 мая',
    'bot_sim_card1_title': 'SOCAR Türkiyədə yeni neft-kimya kompleksinin inşasına başladı',
    'bot_sim_card1_summary': 'Petkim sahəsində 4.2 milyard dollarlıq genişlənmə layihəsinin тeмeлqoймa мерасими keçirilib. Tikinti işləri 2029-cu ilədək tamamlanacaq.',
    'bot_sim_card1_kind': 'Точное',
    'bot_sim_card1_kindnote': 'Точное совпадение · Подходит по дате',
    'bot_sim_card2_date': '11 мая',
    'bot_sim_card2_title': 'Экспорт азербайджанского газа в Европу вырос на 12% в годовом исчислении в апреле',
    'bot_sim_card2_summary': 'Объемы трубопроводного газа через ТАР достигли рекордных 2,4 млрд кубометров в апреле на фоне итальянского и болгарского спроса, согласно данным SOCAR.',
    'bot_sim_card2_kind': 'Семантическое',
    'bot_sim_card2_kindnote': 'Связано с SOCAR · экспорт газа',
    'bot_features_nlp_title': 'Запросы на естественном языке (Conversational NLP)',
    'bot_features_nlp_desc': 'Пишите простые запросы (AZ/RU/EN) без строгих синтаксических правил.',
    'bot_features_cards_title': 'Премиальные HTML-карточки ответов',
    'bot_features_cards_desc': 'Чистые, кликабельные заголовки, ярлыки источников и точные гибридные баллы.',
    'bot_features_paging_title': 'Безрежимные кнопки пагинации',
    'bot_features_paging_desc': 'Динамическая пагинация результатов с помощью оптимизированных callback-запросов.',
    'bot_open_btn': 'Открыть @SiftNBot',
    'bot_replay_btn': 'Повторить демо',
    'tg_online': 'бот · в сети',
    'tg_today': 'Сегодня',
    'tg_message_placeholder': 'Сообщение',
    'tg_open_link': 'Открыть ссылку',
    'tg_share': 'Поделиться',
  }
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('az');

  useEffect(() => {
    const saved = localStorage.getItem('sift-language') as Language;
    if (saved === 'az' || saved === 'en' || saved === 'ru') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sift-language', lang);
  };

  const t = (key: string, replacements?: Record<string, string>): string => {
    let text = DICTIONARIES[language][key] || DICTIONARIES['en'][key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), v);
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
