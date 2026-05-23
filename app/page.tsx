'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  Loader2
} from 'lucide-react';
import { ParsedQuery } from '@/lib/search/parse-query';
import { SearchResult } from '@/lib/search/search';
import { ResultsRail } from '@/components/results-rail';

// Skeleton UI Components matching Claude Design warm-paper theme
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

// Text tag for languages
function LangTag({ lang }: { lang: string }) {
  const map: Record<string, string> = { az: "AZ", ru: "RU", en: "EN" };
  return <span className="lang-tag font-mono text-[10px]" data-lang={lang}>{map[lang] || lang.toUpperCase()}</span>;
}

// Source pip - rounded letter icon + source domain
function SourcePip({ source }: { source: string }) {
  const letter = source.slice(0, 1).toUpperCase();
  return (
    <span className="source-pip" title={source}>
      <span className="source-pip-letter">{letter}</span>
      <span className="source-pip-name">{source}</span>
    </span>
  );
}

// Preset Chips for starting query templates
const PRESET_CHIPS = [
  { q: "SOCAR news on May 14",    label: "SOCAR news on May 14" },
  { q: "banking regulation",      label: "Banking regulation" },
  { q: "AccessBank news",         label: "AccessBank news" },
  { q: "Qarabağ reconstruction",  label: "Qarabağ reconstruction" },
  { q: "financial regulation",    label: "Financial regulation" },
  { q: "gas exports Europe",      label: "Gas exports to Europe" },
];

// Curated static starter feed matching corpus focus
const MOCK_RECENT_ARTICLES: SearchResult[] = [
  {
    id: 10001,
    title: "SOCAR Türkiyədə yeni neft-kimya kompleksinin inşasına başladı",
    language: "az",
    source: "socar.az",
    published_at: "2026-05-14T09:42:00.000Z",
    content: "Dövlət Neft Şirkəti Petkim sahəsində 4.2 milyard dollarlıq genişlənmə layihəsinin təməlqoyma mərasimini keçirib. Layihə 2029-cu ilədək tamamlanacaq.",
    category: "Energy",
    semantic_score: 0.95,
    keyword_score: 0.9,
    combined_score: 0.94,
    relevance_score: 98,
    match_reason: "Surfaced from index: Energy vertical",
    link: "https://socar.az"
  },
  {
    id: 10002,
    title: "АзСтат: годовая инфляция в Азербайджане замедлилась до 4.1% в апреле",
    language: "ru",
    source: "interfax.ru",
    published_at: "2026-05-13T14:18:00.000Z",
    content: "Государственный комитет по статистике сообщил о замедлении годовой инфляции до 4.1% в апреле 2026 года, что является минимумом с октября прошлого года.",
    category: "Economy",
    semantic_score: 0.88,
    keyword_score: 0.85,
    combined_score: 0.87,
    relevance_score: 87,
    match_reason: "Surfaced from index: Economy vertical",
    link: "https://interfax.ru"
  },
  {
    id: 10003,
    title: "Central Bank of Azerbaijan holds refinancing rate at 7.25%",
    language: "en",
    source: "reuters.com",
    published_at: "2026-05-14T11:05:00.000Z",
    content: "CBAR's Management Board kept the policy rate unchanged for the third consecutive meeting, citing stable inflation expectations and resilient FX reserves.",
    category: "Finance",
    semantic_score: 0.92,
    keyword_score: 0.9,
    combined_score: 0.91,
    relevance_score: 92,
    match_reason: "Surfaced from index: Finance vertical",
    link: "https://reuters.com"
  }
];

function SearchDashboard() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [interpretation, setInterpretation] = useState<ParsedQuery | null>(null);
  const [timing, setTiming] = useState<{
    dbTimeMs: number;
    parseTimeMs: number;
    totalTimeMs: number;
    apiDurationMs: number;
    estimatedCostUsd: number;
  } | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q');

  useEffect(() => {
    if (q) {
      setQuery(q);
      handleSearch(q);
    }
  }, [q]);

  // Execute hybrid database search
  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setInterpretation(null);
    setSubmittedQuery(searchQuery);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch search results.');
      }

      const data = await response.json();
      setResults(data.results || []);
      setInterpretation(data.interpretation || null);
      
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
    setTiming(null);
    setError(null);
  };

  const hasQuery = !!submittedQuery;

  return (
    <div className="home">
      <div className="home-grid">
        <main className="home-main">
          
          {/* Hero Section - Only shown when there is no query and we are not loading */}
          {!hasQuery && !isLoading && (
            <section className="hero">
              <div className="hero-headline">
                <div className="hero-eyebrow">Search · Analyze · Sift</div>
                <h1 className="hero-title">
                  Sift the <em>signal</em> from the noise.
                </h1>
                <p className="hero-sub">
                  Hybrid semantic search across <strong>20,915</strong> Azerbaijani,
                  Russian and English news articles (May 10–15, 2026).
                </p>
              </div>
            </section>
          )}

          {/* Search Box and Suggestions */}
          <section className="hero mb-8">
            <form className={`search-box ${isLoading ? 'is-busy' : ''}`} onSubmit={handleFormSubmit}>
              <Search className="search-box-icon w-[22px] h-[22px]" />
              <input
                type="text"
                className="search-input"
                placeholder="Ask anything — “SOCAR news on May 14”, “banking regulation”..."
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
                <span>{isLoading ? 'Searching...' : 'Search'}</span>
                <ArrowRight className="w-[16px] h-[16px]" />
              </button>
            </form>

            {/* Chip Row - Only shown when no search has been submitted and not loading */}
            {!hasQuery && !isLoading && (
              <div className="chip-row">
                <div className="chip-row-label">Try a query</div>
                <div className="chip-row-items">
                  {PRESET_CHIPS.map((c) => (
                    <button key={c.q} className="chip" onClick={() => handleChipClick(c.q)}>
                      <ArrowRight className="w-[13px] h-[13px]" />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Pill - Show when interpretation is parsed and not loading */}
            {interpretation && !isLoading && (
              <div className="ai-pill">
                <div className="ai-pill-label">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sift understood</span>
                </div>
                <div className="ai-pill-row">
                  {interpretation.topic && (
                    <span className="ai-token ai-token-topic">
                      <span className="ai-token-key">Topic</span>
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
                </div>
                <div className="ai-pill-explain">
                  Semantic matching & entity-filtering across the corpus.
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

            {/* Error Message */}
            {error && !isLoading && (
              <div className="glass-panel border-red-500/30 rounded-2xl p-6 flex items-start gap-4 mb-6">
                <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <h4 className="font-semibold text-red-700">Search Retrieval Failed</h4>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Live Search Results */}
            {!isLoading && !error && hasQuery && results.length > 0 && (
              <>
                <div className="results-bar">
                  <div className="results-bar-left">
                    <span className="results-count">{results.length}</span>
                    <span className="results-count-label">results</span>
                    <span className="results-sep">·</span>
                    <span className="results-time">ranked in {timing?.totalTimeMs || 120}ms</span>
                  </div>
                  <div className="results-bar-right flex items-center gap-3">
                    {timing && (
                      <span className="text-[11px] text-[var(--muted)] font-mono hidden sm:inline">
                        DB: {timing.dbTimeMs}ms · AI Parse: {timing.parseTimeMs}ms · Est. Cost: ${timing.estimatedCostUsd?.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="results-list">
                  {results.map((art, idx) => (
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
                        <div className="rel-label">Relevance</div>
                        <a href={art.link} target="_blank" rel="noopener noreferrer" className="card-open" title="Open Link">
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      </aside>
                    </article>
                  ))}
                </div>
                
                <div className="results-foot justify-center sm:justify-start">
                  <span>Looking for insights instead?</span>
                  <button className="link-btn font-medium flex items-center" onClick={() => router.push('/insights')}>
                    Open Insights <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </>
            )}

            {/* Fallback Empty State / Awaiting Search */}
            {!isLoading && !error && !hasQuery && (
              <div className="empty-state">
                <div className="empty-state-head">
                  <span className="empty-state-eyebrow">Recently surfaced</span>
                  <h3 className="empty-state-title">What the corpus has been talking about</h3>
                </div>
                <div className="results-list">
                  {MOCK_RECENT_ARTICLES.map((art, idx) => (
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
                        </div>
                        <h3 className="news-title" lang={art.language}>{art.title}</h3>
                        <p className="news-summary" lang={art.language}>{art.content}</p>
                        <div className="news-card-foot">
                          <div className="match-info">
                            <span className="match-kind match-kind-semantic">
                              Semantic
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
                        <div className="rel-label">Relevance</div>
                        <a href={art.link} target="_blank" rel="noopener noreferrer" className="card-open" title="Open Link">
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      </aside>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting search query matches empty state */}
            {!isLoading && !error && hasQuery && results.length === 0 && (
              <div className="empty-state text-center py-16 bg-white border border-[var(--hairline)] rounded-[var(--r-lg)] p-12 mt-6">
                <div className="max-w-md mx-auto flex flex-col items-center gap-3">
                  <Search className="w-8 h-8 text-[var(--faint)]" />
                  <h3 className="font-semibold text-lg text-[var(--ink)]">No results found</h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    Sift scanned the 20,915 article corpus but couldn't find matches for "{submittedQuery}". Try refining your operators or search terms.
                  </p>
                  <button 
                    onClick={clearSearch}
                    className="mt-2 px-4 py-2 bg-[var(--ink)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--accent)] transition-all"
                  >
                    Clear search
                  </button>
                </div>
              </div>
            )}
          </section>

        </main>

        {/* Sidebar Analytics */}
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

