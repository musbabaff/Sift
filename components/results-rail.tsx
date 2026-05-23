'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SearchResult } from '@/lib/search/search';
import { 
  Activity, 
  ArrowRight,
  Cpu,
  Loader2,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface UIEntity {
  term: string;
  count?: number;
  type: 'ORG' | 'PERSON' | 'LOCATION' | 'TOPIC';
}

interface ResultsRailProps {
  results: SearchResult[];
  onEntityClick: (term: string) => void;
  hasQuery: boolean;
}

const SOURCE_NAMES: Record<string, string> = {
  "oxu.az": "Oxu.az",
  "trend.az": "Trend.az",
  "report.az": "Report.az",
  "apa.az": "APA",
  "marja.az": "Marja.az",
  "socar.az": "SOCAR",
  "cbar.az": "CBAR",
  "interfax.ru": "Interfax",
  "tass.ru": "TASS",
  "reuters.com": "Reuters",
  "ft.com": "Financial Times",
  "bloomberg.com": "Bloomberg",
};

// Custom colors based on entity types
const typeBadgeStyles = {
  ORG: 'bg-[rgba(111,71,199,0.06)] border-[var(--kind-semantic)]/20 text-[var(--kind-semantic)] hover:bg-[rgba(111,71,199,0.12)]',
  PERSON: 'bg-[rgba(14,110,58,0.06)] border-[var(--kind-exact)]/20 text-[var(--kind-exact)] hover:bg-[rgba(14,110,58,0.12)]',
  LOCATION: 'bg-[rgba(181,121,12,0.06)] border-[var(--kind-lexical)]/20 text-[var(--kind-lexical)] hover:bg-[rgba(181,121,12,0.12)]',
  TOPIC: 'bg-white border-[var(--hairline)] text-[var(--ink-2)] hover:bg-[var(--paper-2)]'
};

const typeLabels = {
  ORG: 'Organization',
  PERSON: 'Person',
  LOCATION: 'Location',
  TOPIC: 'Topic'
};

export function ResultsRail({ results, onEntityClick, hasQuery }: ResultsRailProps) {
  const [activeTab, setActiveTab] = useState<'live' | 'global'>('live');
  const [liveEntities, setLiveEntities] = useState<UIEntity[]>([]);
  const [globalEntities, setGlobalEntities] = useState<UIEntity[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  const [errorEntities, setErrorEntities] = useState<string | null>(null);

  // Precomputed SIFT_CORPUS_STATS for empty state
  const SIFT_CORPUS_STATS = {
    total: 20915,
    byLang: { az: 0.612, ru: 0.241, en: 0.147 },
    byCategory: [
      { label: "Economy",        share: 0.221 },
      { label: "Politics",       share: 0.184 },
      { label: "Energy",         share: 0.142 },
      { label: "Society",        share: 0.131 },
      { label: "Finance",        share: 0.118 },
      { label: "Culture",        share: 0.082 },
      { label: "Sports",         share: 0.066 },
      { label: "Other",          share: 0.056 },
    ],
    topSources: [
      { id: "oxu.az",      count: 3214 },
      { id: "trend.az",    count: 2871 },
      { id: "report.az",   count: 2412 },
      { id: "apa.az",      count: 2104 },
      { id: "interfax.ru", count: 1487 },
      { id: "marja.az",    count: 1102 },
      { id: "tass.ru",     count: 988 },
      { id: "reuters.com", count: 614 },
    ],
  };

  // 1. Category Mix Calculation
  const cats = useMemo(() => {
    if (!hasQuery || results.length === 0) return SIFT_CORPUS_STATS.byCategory;
    const counts: Record<string, number> = {};
    results.forEach((r) => { 
      const c = r.category || 'Other';
      counts[c] = (counts[c] || 0) + 1; 
    });
    const total = results.length || 1;
    return Object.entries(counts)
      .map(([label, n]) => ({ label, share: n / total }))
      .sort((a, b) => b.share - a.share);
  }, [results, hasQuery]);

  // 2. Languages Calculation
  const langs = useMemo(() => {
    if (!hasQuery || results.length === 0) return SIFT_CORPUS_STATS.byLang;
    const c = { az: 0, ru: 0, en: 0 } as Record<string, number>;
    results.forEach((r) => { 
      const l = r.language?.toLowerCase();
      if (l === 'az' || l === 'ru' || l === 'en') {
        c[l] = (c[l] || 0) + 1; 
      }
    });
    const total = results.length || 1;
    return { az: c.az / total, ru: c.ru / total, en: c.en / total };
  }, [results, hasQuery]);

  // 3. Top Sources Calculation
  const sources = useMemo(() => {
    if (!hasQuery || results.length === 0) return SIFT_CORPUS_STATS.topSources.slice(0, 6);
    const c = {} as Record<string, number>;
    results.forEach((r) => { 
      c[r.source] = (c[r.source] || 0) + 1; 
    });
    return Object.entries(c)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [results, hasQuery]);

  // Fetch live entities whenever search results change
  useEffect(() => {
    async function fetchLiveEntities() {
      if (!hasQuery || results.length === 0) {
        setLiveEntities([]);
        return;
      }

      setIsLoadingEntities(true);
      setErrorEntities(null);
      try {
        const articleIds = results.map(r => r.id);
        const response = await fetch('/api/entities/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_ids: articleIds })
        });

        if (!response.ok) throw new Error('Failed to analyze live entities.');
        const data = await response.json();
        setLiveEntities(data.entities || []);
      } catch (err: any) {
        console.error('[ResultsRail Live Entities Error]', err);
        setErrorEntities(err.message || 'Failed to extract live entities.');
      } finally {
        setIsLoadingEntities(false);
      }
    }

    fetchLiveEntities();
  }, [results, hasQuery]);

  // Fetch global entities when the global tab is clicked
  useEffect(() => {
    async function fetchGlobalEntities() {
      if (activeTab !== 'global' || globalEntities.length > 0) return;

      setIsLoadingEntities(true);
      setErrorEntities(null);
      try {
        const response = await fetch('/api/entities/global?limit=15');
        if (!response.ok) throw new Error('Failed to fetch global statistics.');
        const data = await response.json();
        setGlobalEntities(data.entities || []);
      } catch (err: any) {
        console.error('[ResultsRail Global Entities Error]', err);
        setErrorEntities(err.message || 'Failed to retrieve global statistics.');
      } finally {
        setIsLoadingEntities(false);
      }
    }

    fetchGlobalEntities();
  }, [activeTab, globalEntities.length]);

  const activeEntities = activeTab === 'live' ? liveEntities : globalEntities;

  return (
    <aside className="rail">
      {/* Header section */}
      <div className="rail-head">
        <span className="rail-eyebrow">Live analytics</span>
        <h4 className="rail-title">{hasQuery ? "On this query" : "Corpus overview"}</h4>
        <div className="rail-sub">
          {hasQuery
            ? `${results.length} result${results.length === 1 ? "" : "s"}`
            : `20,915 docs · May 10–15, 2026`}
        </div>
      </div>

      {/* Category mix */}
      <section className="bg-white border border-[var(--hairline)] rounded-[var(--r-lg)] p-5 flex flex-col gap-3">
        <header className="flex justify-between items-baseline border-b border-[var(--hairline-2)] pb-2 mb-1">
          <span className="text-[12.5px] font-semibold text-[var(--ink)]">Category mix</span>
          <span className="text-[10px] text-[var(--muted)] font-mono">{cats.length} categories</span>
        </header>
        <ul className="bar-list">
          {cats.slice(0, 5).map((c) => (
            <li key={c.label}>
              <div className="bar-list-row">
                <span className="bar-list-label">{c.label}</span>
                <span className="bar-list-val">{(c.share * 100).toFixed(c.share < 0.1 ? 1 : 0)}%</span>
              </div>
              <div className="inline-bar">
                <div 
                  className="inline-bar-fill" 
                  style={{ width: `${c.share * 100}%`, background: "var(--ink)" }} 
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Top sources */}
      <section className="bg-white border border-[var(--hairline)] rounded-[var(--r-lg)] p-5 flex flex-col gap-3">
        <header className="flex justify-between items-baseline border-b border-[var(--hairline-2)] pb-2 mb-1">
          <span className="text-[12.5px] font-semibold text-[var(--ink)]">Top sources</span>
        </header>
        <ul className="src-list">
          {sources.map((s) => {
            const displayName = SOURCE_NAMES[s.id] || s.id;
            const letter = displayName.slice(0, 1);
            return (
              <li key={s.id} className="flex justify-between items-center px-2 py-1.5 bg-[var(--surface-2)] border border-[var(--hairline-2)] rounded-lg">
                <span className="source-pip" title={displayName}>
                  <span className="source-pip-letter">{letter}</span>
                  <span className="source-pip-name">{displayName}</span>
                </span>
                <span className="src-count font-mono font-medium text-[var(--muted)]">{s.count}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Languages */}
      <section className="bg-white border border-[var(--hairline)] rounded-[var(--r-lg)] p-5 flex flex-col gap-3">
        <header className="flex justify-between items-baseline border-b border-[var(--hairline-2)] pb-2 mb-1">
          <span className="text-[12.5px] font-semibold text-[var(--ink)]">Languages</span>
        </header>
        <div className="lang-bars">
          {(['az', 'ru', 'en'] as const).map((l) => {
            const share = langs[l] || 0;
            const labelMap = { az: "AZ", ru: "RU", en: "EN" };
            return (
              <div key={l} className="lang-bar-row">
                <span className="lang-tag shrink-0 w-8 text-center" data-lang={l}>{labelMap[l]}</span>
                <div className="inline-bar">
                  <div 
                    className="inline-bar-fill" 
                    style={{ 
                      width: `${share * 100}%`, 
                      background: l === 'az' ? 'var(--accent)' : 'var(--ink)' 
                    }} 
                  />
                </div>
                <span className="lang-bar-val font-mono">
                  {Math.round(share * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dynamic Entity Intelligence Feed (Premium integration) */}
      <section className="bg-white border border-[var(--hairline)] rounded-[var(--r-lg)] p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-[var(--hairline-2)] pb-2.5">
          <Activity className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="font-semibold text-xs tracking-wide uppercase text-[var(--ink)]">
            Intelligence Feed
          </h3>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[var(--paper-2)] border border-[var(--hairline)] rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'live'
                ? 'bg-white border border-[var(--hairline)] text-[var(--ink)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            In results
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'global'
                ? 'bg-white border border-[var(--hairline)] text-[var(--ink)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            All news
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoadingEntities && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="w-5 h-5 text-[var(--ink)] animate-spin" />
            <span className="text-[10px] text-[var(--muted)] font-mono">Tokenizing...</span>
          </div>
        )}

        {/* Error State */}
        {errorEntities && !isLoadingEntities && (
          <div className="p-2.5 rounded-lg bg-red-50/50 border border-red-200 text-[11px] text-red-700">
            <span>{errorEntities}</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingEntities && !errorEntities && activeEntities.length === 0 && (
          <div className="text-center py-6 flex flex-col items-center gap-1.5">
            <Cpu className="w-7 h-7 text-[var(--faint)]" />
            <div>
              <h4 className="text-[11px] font-bold text-[var(--ink-2)]">No entities extracted</h4>
              <p className="text-[9px] text-[var(--muted)] leading-relaxed mt-0.5">
                {activeTab === 'live' 
                  ? 'Awaiting active queries to live tokenize.' 
                  : 'Precomputations are loading.'}
              </p>
            </div>
          </div>
        )}

        {/* Entity List */}
        {!isLoadingEntities && !errorEntities && activeEntities.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider px-1">
              <span>Entity</span>
              <span>{activeTab === 'live' ? 'Count' : 'Mentions'}</span>
            </div>
            
            <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-0.5">
              <AnimatePresence mode="popLayout">
                {activeEntities.slice(0, 10).map((entity, index) => (
                  <motion.button
                    key={entity.term + entity.type}
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    onClick={() => onEntityClick(entity.term)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg border font-sans text-left transition-all group cursor-pointer ${
                      typeBadgeStyles[entity.type] || typeBadgeStyles.TOPIC
                    }`}
                  >
                    <div className="flex flex-col truncate max-w-[170px]">
                      <span className="text-[12px] font-medium text-[var(--ink)] truncate">
                        {entity.term}
                      </span>
                      <span className="text-[8.5px] font-semibold text-[var(--muted)] uppercase tracking-wide">
                        {typeLabels[entity.type]}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0 font-mono">
                      {entity.count && (
                        <span className="text-[10px] font-bold bg-white/70 border border-[var(--hairline)] px-1.5 py-0.5 rounded">
                          {entity.count}
                        </span>
                      )}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
            <p className="text-[9.5px] text-[var(--muted)] leading-relaxed italic text-center border-t border-[var(--hairline-2)] pt-2 mt-1">
              💡 Tip: Click any badge to filter queries instantly.
            </p>
          </div>
        )}
      </section>

      {/* Helpful operator Tip section */}
      <section className="rail-section-tip">
        <Cpu className="w-4 h-4 shrink-0 text-[var(--accent)]" />
        <div>
          <div className="rail-tip-title text-[var(--accent-ink)]">Refine with operators</div>
          <div className="rail-tip-body">
            Try filters like <code>source:marja.az</code>, <code>lang:az</code>, <code>after:2026-05-12</code>
          </div>
        </div>
      </section>
    </aside>
  );
}

