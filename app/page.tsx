'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Sparkles, 
  Layers, 
  Calendar, 
  Radio, 
  ArrowUpRight, 
  Clock, 
  AlertCircle, 
  Cpu, 
  X,
  ArrowRight,
  Loader2,
  Download,
  Moon,
  Sun,
  TrendingUp,
  Brain
} from 'lucide-react';
import { ParsedQuery } from '@/lib/search/parse-query';
import { SearchResult } from '@/lib/search/search';
import { ResultsRail } from '@/components/results-rail';
import { useLanguage } from '@/components/language-provider';

// ─── Utility Components ─────────────────────────────────────────────────────

function Skeleton({ w = "100%", h = 12, rounded = 6, style = {} }: { w?: string | number, h?: number, rounded?: number, style?: React.CSSProperties }) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: rounded, ...style }} />;
}

function SkeletonCard() {
  return (
    <div className="news-card sk-card">
      <div className="news-card-body">
        <div className="flex gap-2 mb-3">
          <Skeleton w={32} h={16} />
          <Skeleton w={64} h={16} />
          <Skeleton w={48} h={16} />
        </div>
        <Skeleton w="86%" h={26} style={{ marginBottom: 10 }} />
        <Skeleton w="62%" h={26} style={{ marginBottom: 18 }} />
        <Skeleton w="96%" h={12} style={{ marginBottom: 6 }} />
        <Skeleton w="78%" h={12} />
      </div>
      <div className="news-card-rail flex flex-col items-center">
        <Skeleton w={44} h={44} rounded={22} />
        <Skeleton w={80} h={10} style={{ marginTop: 10 }} />
      </div>
    </div>
  );
}

function LangTag({ lang }: { lang: string }) {
  const map: Record<string, string> = { az: "AZ", ru: "RU", en: "EN" };
  return <span className="lang-tag font-mono text-[10px]" data-lang={lang}>{map[lang] || lang.toUpperCase()}</span>;
}

function SourcePip({ source }: { source: string }) {
  const letter = source.slice(0, 1).toUpperCase();
  return (
    <span className="source-pip" title={source}>
      <span className="source-pip-letter">{letter}</span>
      <span className="source-pip-name">{source}</span>
    </span>
  );
}

// ─── Sentiment Analysis (Zero-cost, keyword-based) ──────────────────────────

const NEGATIVE_KEYWORDS = [
  'böhran', 'itki', 'azaldı', 'risk', 'müharibə', 'cinayət', 'qəza', 'ölüm', 'həbs',
  'sanksiya', 'təhlükə', 'fəlakət', 'korrupsiya', 'tənəzzül', 'inflasiya', 'devalvasiya',
  'crisis', 'loss', 'decline', 'risk', 'war', 'crime', 'crash', 'death', 'arrest',
  'sanction', 'threat', 'disaster', 'corruption', 'recession', 'inflation',
  'кризис', 'потеря', 'риск', 'война', 'угроза', 'инфляция', 'коррупция', 'арест',
];

const POSITIVE_KEYWORDS = [
  'artım', 'uğur', 'inkişaf', 'müsbət', 'rekord', 'genişlənmə', 'yüksəlmə',
  'investisiya', 'nail', 'açılış', 'təbrik', 'mükafat', 'irəliləyiş',
  'growth', 'success', 'rise', 'increase', 'record', 'expansion', 'investment',
  'achievement', 'launch', 'award', 'progress', 'approval',
  'рост', 'успех', 'рекорд', 'расширение', 'инвестиция', 'достижение',
];

function analyzeSentiment(title: string, content: string): 'positive' | 'negative' | 'neutral' {
  const text = `${title} ${content}`.toLowerCase();
  let pos = 0, neg = 0;
  NEGATIVE_KEYWORDS.forEach(kw => { if (text.includes(kw)) neg++; });
  POSITIVE_KEYWORDS.forEach(kw => { if (text.includes(kw)) pos++; });
  if (neg > pos && neg >= 1) return 'negative';
  if (pos > neg && pos >= 1) return 'positive';
  return 'neutral';
}

function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'negative' | 'neutral' }) {
  const { t } = useLanguage();
  const config = {
    positive: { icon: '↑', label: t('sentiment_positive'), cls: 'sentiment-positive' },
    negative: { icon: '↓', label: t('sentiment_negative'), cls: 'sentiment-negative' },
    neutral:  { icon: '—', label: t('sentiment_neutral'),  cls: 'sentiment-neutral' },
  };
  const c = config[sentiment];
  return (
    <span className={`sentiment-badge ${c.cls}`}>
      <span>{c.icon}</span>
      <span>{c.label}</span>
    </span>
  );
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

function exportToCSV(results: SearchResult[], query: string) {
  const headers = ['Title', 'Source', 'Language', 'Category', 'Published', 'Relevance Score', 'Sentiment', 'URL'];
  const rows = results.map(r => {
    const sentiment = analyzeSentiment(r.title, r.content);
    return [
      `"${r.title.replace(/"/g, '""')}"`,
      r.source,
      r.language.toUpperCase(),
      r.category,
      new Date(r.published_at).toISOString().split('T')[0],
      r.relevance_score.toString(),
      sentiment,
      r.link,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sift-results-${query.replace(/\s+/g, '-').substring(0, 30)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

import { Language } from '@/components/language-provider';

// ─── Rotating Search Suggestions ────────────────────────────────────────────

const SUGGESTIONS: Record<Language, string[]> = {
  az: [
    "SOCAR xəbərləri 14 May",
    "bank tənzimlənməsi",
    "AccessBank xəbərləri",
    "Qarabağın yenidən qurulması",
    "Avropaya qaz ixracı",
    "vergilər iqtisadiyyat xəbərləri",
    "Mərkəzi Bank faiz dərəcəsi",
    "riskli maliyyə xəbərləri",
    "PAŞA Holdinq",
    "Qəbələ caz festivalı",
  ],
  en: [
    "SOCAR news on May 14",
    "banking regulation",
    "AccessBank news",
    "Qarabağ reconstruction",
    "gas exports to Europe",
    "taxes economy news",
    "Central Bank interest rate",
    "risky financial news",
    "PASHA Holding",
    "Qəbələ jazz festival",
  ],
  ru: [
    "новости SOCAR за 14 мая",
    "банковское регулирование",
    "новости AccessBank",
    "восстановление Карабаха",
    "экспорт газа в Европу",
    "налоги новости экономики",
    "процентная ставка Центробанка",
    "рискованные финансовые новости",
    "ПАША Холдинг",
    "джазовый фестиваль в Габале",
  ]
};

function useRotatingPlaceholder(lang: Language) {
  const [index, setIndex] = useState(0);
  const list = SUGGESTIONS[lang] || SUGGESTIONS['en'];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % list.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [list.length]);

  const prefix = lang === 'az' ? 'Yoxlayın: ' : lang === 'ru' ? 'Попробуйте: ' : 'Try: ';
  return `${prefix}"${list[index]}"`;
}

// ─── Preset Chips ───────────────────────────────────────────────────────────

const PRESET_CHIPS: Record<Language, { q: string; label: string }[]> = {
  az: [
    { q: "SOCAR xəbərləri 14 May",    label: "SOCAR xəbərləri 14 May" },
    { q: "bank tənzimlənməsi",        label: "Bank tənzimlənməsi" },
    { q: "AccessBank xəbərləri",      label: "AccessBank xəbərləri" },
    { q: "Qarabağın yenidən qurulması",label: "Qarabağın bərpası" },
    { q: "maliyyə tənzimlənməsi",     label: "Maliyyə tənzimlənməsi" },
    { q: "Avropaya qaz ixracı",       label: "Avropaya qaz ixracı" },
  ],
  en: [
    { q: "SOCAR news on May 14",    label: "SOCAR news on May 14" },
    { q: "banking regulation",      label: "Banking regulation" },
    { q: "AccessBank news",         label: "AccessBank news" },
    { q: "Qarabağ reconstruction",  label: "Qarabağ reconstruction" },
    { q: "financial regulation",    label: "Financial regulation" },
    { q: "gas exports Europe",      label: "Gas exports to Europe" },
  ],
  ru: [
    { q: "новости SOCAR за 14 мая",    label: "новости SOCAR за 14 мая" },
    { q: "банковское регулирование",   label: "Банковское регулирование" },
    { q: "новости AccessBank",         label: "новости AccessBank" },
    { q: "восстановление Карабаха",    label: "Восстановление Карабаха" },
    { q: "финансовое регулирование",   label: "Финансовое регулирование" },
    { q: "экспорт газа в Европу",      label: "Экспорт газа в Европу" },
  ]
};

// ─── Main Search Dashboard ──────────────────────────────────────────────────

function SearchDashboard() {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [interpretation, setInterpretation] = useState<ParsedQuery | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [timing, setTiming] = useState<{
    dbTimeMs: number;
    parseTimeMs: number;
    totalTimeMs: number;
    apiDurationMs: number;
    estimatedCostUsd: number;
  } | null>(null);

  // Real recent articles from DB
  const [recentArticles, setRecentArticles] = useState<SearchResult[]>([]);
  const [corpusTotal, setCorpusTotal] = useState<number>(0);

  // Trending entities for homepage
  const [trendingEntities, setTrendingEntities] = useState<{ term: string; type: string; count: number }[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q');
  const placeholder = useRotatingPlaceholder(language);

  // Fetch real corpus data on mount (recent articles + trending)
  useEffect(() => {
    async function loadCorpusData() {
      try {
        const [corpusRes, entitiesRes] = await Promise.all([
          fetch('/api/corpus'),
          fetch('/api/entities/global?limit=12'),
        ]);
        
        if (corpusRes.ok) {
          const data = await corpusRes.json();
          setRecentArticles(data.recentArticles || []);
          setCorpusTotal(data.total || 0);
        }
        
        if (entitiesRes.ok) {
          const data = await entitiesRes.json();
          setTrendingEntities(data.entities || []);
        }
      } catch (err) {
        console.warn('[Homepage] Failed to load corpus data:', err);
      }
    }
    loadCorpusData();
  }, []);

  useEffect(() => {
    if (q) {
      setQuery(q);
      handleSearch(q);
    }
  }, [q]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setInterpretation(null);
    setAiSummary(null);
    setDidYouMean(null);
    setSubmittedQuery(searchQuery);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, language }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch search results.');
      }

      const data = await response.json();
      setResults(data.results || []);
      setInterpretation(data.interpretation || null);
      setAiSummary(data.aiSummary || null);
      setDidYouMean(data.didYouMean || null);
      
      if (data.telemetry && data.apiTelemetry) {
        setTiming({
          dbTimeMs: data.telemetry.dbTimeMs,
          parseTimeMs: data.telemetry.parseTimeMs,
          totalTimeMs: data.telemetry.totalTimeMs,
          apiDurationMs: data.apiTelemetry.apiDurationMs,
          estimatedCostUsd: data.apiTelemetry.estimatedCostUsd
        });
      }
    } catch (err: any) {
      console.error('[Search Dashboard Error]', err);
      setError(err.message || 'An unexpected connection error occurred.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleChipClick = (chipQuery: string) => {
    setQuery(chipQuery);
    handleSearch(chipQuery);
  };

  const clearSearch = () => {
    setQuery('');
    setSubmittedQuery('');
    setResults([]);
    setInterpretation(null);
    setAiSummary(null);
    setDidYouMean(null);
    setTiming(null);
    setError(null);
  };

  const hasQuery = !!submittedQuery;

  // Articles to show in the "recently surfaced" section — real DB data
  const displayArticles = recentArticles.length > 0 ? recentArticles : [];

  return (
    <div className="home">
      <div className="home-grid">
        <main className="home-main">
          
          {/* Hero Section */}
          {!hasQuery && !isLoading && (
            <section className="hero">
              <div className="hero-headline">
                <div className="hero-eyebrow">{t('hero_eyebrow')}</div>
                <h1 className="hero-title">
                  {t('hero_title_1')}<em>{t('hero_title_em')}</em>{t('hero_title_2')}
                </h1>
                <p className="hero-sub">
                  {t('hero_sub', { total: corpusTotal > 0 ? corpusTotal.toLocaleString() : '20,915' })}
                </p>
              </div>
            </section>
          )}

          {/* Search Box */}
          <section className="hero mb-8">
            <form className={`search-box ${isLoading ? 'is-busy' : ''}`} onSubmit={handleFormSubmit}>
              <Search className="search-box-icon w-[22px] h-[22px]" />
              <input
                type="text"
                className="search-input"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
              />
              {query && !isLoading && (
                <button type="button" className="search-clear" onClick={clearSearch} aria-label="Clear">
                  <X className="w-[16px] h-[16px]" />
                </button>
              )}
              <button type="submit" className="search-go" disabled={isLoading || !query.trim()}>
                <span>{isLoading ? t('searching_btn') : t('search_btn')}</span>
                <ArrowRight className="w-[16px] h-[16px]" />
              </button>
            </form>

            {/* Chip Row + Trending Topics */}
            {!hasQuery && !isLoading && (
              <>
                <div className="chip-row">
                  <div className="chip-row-label">{t('try_query')}</div>
                  <div className="chip-row-items">
                    {(PRESET_CHIPS[language] || PRESET_CHIPS['en']).map((c) => (
                      <button key={c.q} className="chip" onClick={() => handleChipClick(c.q)}>
                        <ArrowRight className="w-[13px] h-[13px]" />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trending Topics from real entity_stats */}
                {trendingEntities.length > 0 && (
                  <div className="trending-section mt-6">
                    <div className="trending-label flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{t('trending_corpus')}</span>
                    </div>
                    <div className="trending-chips flex flex-wrap gap-2">
                      {trendingEntities.map((ent) => (
                        <button 
                          key={ent.term} 
                          className="trending-chip inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--surface)] border border-[var(--hairline)] rounded-full text-xs text-[var(--ink-2)] font-medium hover:border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-all cursor-pointer" 
                          onClick={() => handleChipClick(ent.term)}
                        >
                          <span className="trending-chip-name font-medium">{ent.term}</span>
                          <span className="trending-chip-count font-mono text-[10px] text-[var(--faint)] bg-[var(--paper-2)] px-1.5 py-0.5 rounded-full">
                            {ent.count.toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* AI Interpretation Pill */}
            {interpretation && !isLoading && (
              <div className="ai-pill">
                <div className="ai-pill-label">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('sift_understood')}</span>
                </div>
                <div className="ai-pill-row">
                  {interpretation.topic && (
                    <span className="ai-token ai-token-topic">
                      <span className="ai-token-key">{t('token_topic')}</span>
                      <span className="ai-token-val">{interpretation.topic}</span>
                    </span>
                  )}
                  {(interpretation.date_from || interpretation.date_to) && (
                    <span className="ai-token">
                      <Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span className="ai-token-val">
                        {interpretation.date_from ? new Date(interpretation.date_from).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Start'}
                        {' – '}
                        {interpretation.date_to ? new Date(interpretation.date_to).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'End'}
                      </span>
                    </span>
                  )}
                  {interpretation.category_hint && (
                    <span className="ai-token">
                      <Layers className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span className="ai-token-val">{interpretation.category_hint}</span>
                    </span>
                  )}
                  {interpretation.source_hint && (
                    <span className="ai-token">
                      <Radio className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span className="ai-token-val">{interpretation.source_hint}</span>
                    </span>
                  )}
                  {interpretation.sentiment_hint && (
                    <span className="ai-token">
                      <span className="ai-token-key">{t('token_sentiment')}</span>
                      <span className="ai-token-val">{t('sentiment_' + interpretation.sentiment_hint)}</span>
                    </span>
                  )}
                </div>
                <div className="ai-pill-explain">
                  {t('semantic_matching_desc')}
                </div>
              </div>
            )}
          </section>

          {/* Results Area */}
          <section className="results">
            {isLoading && (
              <div className="results-list">
                <div className="results-bar">
                  <Skeleton w={180} h={14} />
                  <Skeleton w={120} h={14} />
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Did you mean? */}
            {didYouMean && !isLoading && (
              <div className="did-you-mean">
                <span className="did-you-mean-label">{t('did_you_mean')}</span>
                <button 
                  className="did-you-mean-suggestion"
                  onClick={() => handleChipClick(didYouMean)}
                >
                  {didYouMean}
                </button>
                <span className="did-you-mean-hint">?</span>
              </div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <div className="glass-panel border-red-500/30 rounded-2xl p-6 flex items-start gap-4 mb-6">
                <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <h4 className="font-semibold text-red-700">{t('search_failed')}</h4>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Live Search Results */}
            {!isLoading && !error && hasQuery && results.length > 0 && (
              <>
                {/* AI Summary Card */}
                {aiSummary && (
                  <motion.div 
                    className="ai-summary-card"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="ai-summary-header">
                      <Brain className="w-4 h-4" />
                      <span>{t('ai_summary_title')}</span>
                    </div>
                    <p className="ai-summary-text">{aiSummary}</p>
                  </motion.div>
                )}

                <div className="results-bar">
                  <div className="results-bar-left">
                    <span className="results-count">{results.length}</span>
                    <span className="results-count-label">{t('results')}</span>
                    <span className="results-sep">·</span>
                    <span className="results-time">{t('ranked_in')} {timing?.totalTimeMs || 120}ms</span>
                  </div>
                  <div className="results-bar-right flex items-center gap-3">
                    {timing && (
                      <span className="text-[11px] text-[var(--muted)] font-mono hidden sm:inline">
                        {t('telemetry_db')}: {timing.dbTimeMs}ms · {t('telemetry_parse')}: {timing.parseTimeMs}ms · {t('telemetry_cost')}: ${timing.estimatedCostUsd?.toFixed(4)}
                      </span>
                    )}
                    {/* CSV Export Button */}
                    <button 
                      className="csv-export-btn"
                      onClick={() => exportToCSV(results, submittedQuery)}
                      title="Download CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t('download_csv')}</span>
                    </button>
                  </div>
                </div>

                <div className="results-list">
                  {results.map((art, idx) => {
                    const sentiment = analyzeSentiment(art.title, art.content);
                    return (
                      <article className="news-card animate-fade-in" key={art.id} style={{ animationDelay: `${idx * 60}ms` }}>
                        <div className="news-card-body">
                          <div className="news-card-meta">
                            <SourcePip source={art.source} />
                            <LangTag lang={art.language} />
                            <span className="meta-dot">·</span>
                            <span className="meta-date">
                              {new Date(art.published_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span className="meta-time">
                              {new Date(art.published_at).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })}
                            </span>
                            <span className="news-cat">{art.category}</span>
                            <SentimentBadge sentiment={sentiment} />
                          </div>
                          <h3 className="news-title" lang={art.language}>{art.title}</h3>
                          <p className="news-summary" lang={art.language}>{art.content}</p>
                          <div className="news-card-foot">
                            <div className="match-info">
                              <span className={`match-kind match-kind-${
                                art.match_reason?.toLowerCase().includes('exact') ? 'exact' : 
                                art.match_reason?.toLowerCase().includes('semantic') ? 'semantic' : 'lexical'
                              }`}>
                                {art.match_reason?.toLowerCase().includes('exact') ? 'Exact' : 
                                 art.match_reason?.toLowerCase().includes('semantic') ? 'Semantic' : 'Lexical'}
                              </span>
                              <span className="match-explain">{art.match_reason}</span>
                            </div>
                          </div>
                        </div>
                        <aside className="news-card-rail">
                          <div className="rel-ring" style={{ width: 56, height: 56 }}>
                            <svg viewBox="0 0 56 56" width="56" height="56">
                              <circle cx="28" cy="28" r="25"
                                fill="none" stroke="var(--hairline)" strokeWidth="2.5" />
                              <circle cx="28" cy="28" r="25"
                                fill="none" stroke="var(--ink)" strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 25}`}
                                strokeDashoffset={`${2 * Math.PI * 25 * (1 - art.relevance_score / 100)}`}
                                transform="rotate(-90 28 28)"
                              />
                            </svg>
                            <span className="rel-ring-label">{art.relevance_score}</span>
                          </div>
                          <div className="rel-label">{t('relevance')}</div>
                          <a href={art.link} target="_blank" rel="noopener noreferrer" className="card-open" title="Open Link">
                            <ArrowUpRight className="w-4 h-4" />
                          </a>
                        </aside>
                      </article>
                    );
                  })}
                </div>

                <div className="results-foot justify-center sm:justify-start">
                  <span>{t('looking_for_insights')}</span>
                  <button className="link-btn font-medium flex items-center" onClick={() => router.push('/insights')}>
                    {t('open_insights')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </>
            )}

            {/* Empty State — Real recent articles from DB */}
            {!isLoading && !error && !hasQuery && (
              <div className="empty-state">
                <div className="empty-state-head">
                  <span className="empty-state-eyebrow">{t('recently_surfaced')}</span>
                  <h3 className="empty-state-title">{t('what_corpus_talks')}</h3>
                </div>
                {displayArticles.length > 0 ? (
                  <div className="results-list">
                    {displayArticles.map((art, idx) => {
                      const sentiment = analyzeSentiment(art.title, art.content);
                      return (
                        <article className="news-card" key={art.id} style={{ animationDelay: `${idx * 60}ms` }}>
                          <div className="news-card-body">
                            <div className="news-card-meta">
                              <SourcePip source={art.source} />
                              <LangTag lang={art.language} />
                              <span className="meta-dot">·</span>
                              <span className="meta-date">
                                {new Date(art.published_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="meta-time">
                                {new Date(art.published_at).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                })}
                              </span>
                              <span className="news-cat">{art.category}</span>
                              <SentimentBadge sentiment={sentiment} />
                            </div>
                            <h3 className="news-title" lang={art.language}>{art.title}</h3>
                            <p className="news-summary" lang={art.language}>{art.content}</p>
                            <div className="news-card-foot">
                              <div className="match-info">
                                <span className="match-kind match-kind-semantic">Semantic</span>
                                <span className="match-explain">{art.match_reason}</span>
                              </div>
                            </div>
                          </div>
                          <aside className="news-card-rail">
                            <div className="rel-ring" style={{ width: 56, height: 56 }}>
                              <svg viewBox="0 0 56 56" width="56" height="56">
                                <circle cx="28" cy="28" r="25"
                                  fill="none" stroke="var(--hairline)" strokeWidth="2.5" />
                                <circle cx="28" cy="28" r="25"
                                  fill="none" stroke="var(--ink)" strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 25}`}
                                  strokeDashoffset={`${2 * Math.PI * 25 * (1 - art.relevance_score / 100)}`}
                                  transform="rotate(-90 28 28)"
                                />
                              </svg>
                              <span className="rel-ring-label">{art.relevance_score}</span>
                            </div>
                            <div className="rel-label">{t('relevance')}</div>
                            <a href={art.link} target="_blank" rel="noopener noreferrer" className="card-open" title="Open Link">
                              <ArrowUpRight className="w-4 h-4" />
                            </a>
                          </aside>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[var(--muted)] text-sm italic">
                    {t('loading_recent')}
                  </div>
                )}
              </div>
            )}

            {/* No results state */}
            {!isLoading && !error && hasQuery && results.length === 0 && (
              <div className="empty-state text-center py-16 bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] p-12 mt-6">
                <div className="max-w-md mx-auto flex flex-col items-center gap-3">
                  <Search className="w-8 h-8 text-[var(--faint)]" />
                  <h3 className="font-semibold text-lg text-[var(--ink)]">{t('no_results_found')}</h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {t('no_results_desc', { query: submittedQuery })}
                  </p>
                  <button 
                    onClick={clearSearch}
                    className="mt-2 px-4 py-2 bg-[var(--ink)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--accent)] transition-all"
                  >
                    {t('clear_search')}
                  </button>
                </div>
              </div>
            )}
          </section>

        </main>

        {/* Sidebar */}
        <ResultsRail results={results} onEntityClick={handleChipClick} hasQuery={hasQuery} />

      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen py-20 gap-3">
        <Loader2 className="w-8 h-8 text-[var(--ink)] animate-spin" />
        <span className="text-xs text-[var(--muted)] font-mono">Initializing Sift search...</span>
      </div>
    }>
      <SearchDashboard />
    </Suspense>
  );
}
