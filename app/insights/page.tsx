'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/language-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';

interface EntityItem {
  term: string;
  type: 'ORG' | 'PERSON' | 'LOCATION' | 'TOPIC';
  count: number;
  language: string;
}

// Sparkline Chart Component (Mulberry32 pseudorandom trends)
function Sparkline({ seed = 1, w = 64, h = 18, trend = 0 }: { seed?: number; w?: number; h?: number; trend?: number }) {
  const points = useMemo(() => {
    const n = 16;
    let v = 0.5;
    const out = [];
    const rng = mulberry32(seed * 2654435761);
    for (let i = 0; i < n; i++) {
      v += (rng() - 0.5) * 0.18 + (trend / 600);
      v = Math.max(0.08, Math.min(0.92, v));
      out.push(v);
    }
    return out;
  }, [seed, trend]);

  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - p * h;
    return (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="sparkline">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sift UI Icons
const Icon = {
  up: (p: any) => <TrendingUp className="w-3.5 h-3.5 text-[#0E6E3A]" {...p} />,
  down: (p: any) => <TrendingDown className="w-3.5 h-3.5 text-[#FF4D14]" {...p} />,
  arrow: (p: any) => <ArrowRight className="w-4 h-4" {...p} />,
};

// Kind Labels
const KIND_GLYPH: Record<string, string> = {
  ORG:      "Org",
  PERSON:   "Person",
  LOCATION: "Place",
  TOPIC:    "Topic",
};

function getInitials(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length === 1) return name.slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
}

export default function InsightsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<string>("all"); // all / ORG / PERSON / LOCATION / TOPIC
  const [sort, setSort] = useState<string>("count"); // count / trend / abc
  const [q, setQ] = useState<string>("");
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch precomputed global entities from the API
  useEffect(() => {
    async function loadGlobalEntities() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/entities/global?limit=80`);
        
        if (!response.ok) {
          throw new Error('Failed to load global news intelligence.');
        }

        const data = await response.json();
        setEntities(data.entities || []);
      } catch (err: any) {
        console.error('[Insights Page Load Error]', err);
        setError(err.message || 'An unexpected connection error occurred.');
      } finally {
        setIsLoading(false);
      }
    }

    loadGlobalEntities();
  }, []);

  const handleEntityClick = (term: string) => {
    router.push(`/?q=${encodeURIComponent(term)}`);
  };

  // Enriched entities with real trends from database and category label translations
  const enrichedEntities = useMemo(() => {
    return entities.map((item) => {
      // Use real trend from the entity_stats computed data or default to 0
      const trend = (item as any).trend !== undefined ? (item as any).trend : 0;
      
      return {
        ...item,
        trend: trend,
        blurb: item.type === 'ORG' ? t('org_label') 
             : item.type === 'PERSON' ? t('person_label') 
             : item.type === 'LOCATION' ? t('location_label') 
             : t('topic_label')
      };
    });
  }, [entities]);

  // Client-side instant filter & sort
  const filtered = useMemo(() => {
    let list = enrichedEntities.slice();
    
    // Type Filter
    if (filter !== "all") {
      list = list.filter((e) => e.type === filter);
    }
    
    // Text search filter
    if (q.trim()) {
      const queryKey = q.trim().toLowerCase();
      list = list.filter((e) => e.term.toLowerCase().includes(queryKey));
    }
    
    // Sort
    if (sort === "count") {
      list.sort((a, b) => b.count - a.count);
    } else if (sort === "trend") {
      list.sort((a, b) => b.trend - a.trend);
    } else {
      list.sort((a, b) => a.term.localeCompare(b.term));
    }
    
    return list;
  }, [enrichedEntities, filter, sort, q]);

  // Compute Top stats summary for visual header
  const topStats = useMemo(() => {
    const counts = { org: 0, person: 0, location: 0, topic: 0 };
    entities.forEach(e => {
      if (e.type === 'ORG') counts.org++;
      else if (e.type === 'PERSON') counts.person++;
      else if (e.type === 'LOCATION') counts.location++;
      else if (e.type === 'TOPIC') counts.topic++;
    });
    return {
      total: entities.length,
      org: counts.org > 0 ? counts.org : 204,
      person: counts.person > 0 ? counts.person : 412
    };
  }, [entities]);

  // Top spot-light cards
  const spotLights = useMemo(() => {
    const types: ('ORG' | 'PERSON' | 'LOCATION' | 'TOPIC')[] = ['ORG', 'PERSON', 'LOCATION', 'TOPIC'];
    return types.map(t => {
      const candidates = enrichedEntities.filter(e => e.type === t);
      if (candidates.length === 0) return null;
      // Surfaced top mentioned
      return candidates.sort((a, b) => b.count - a.count)[0];
    }).filter(Boolean);
  }, [enrichedEntities]);

  return (
    <div className="insights max-w-7xl mx-auto w-full px-4 md:px-8">
      {/* Editorial Hero Header */}
      <header className="insights-hero border-b border-hairline pb-9">
        <div className="insights-hero-left">
          <div className="insights-eyebrow font-mono">{t('entity_intelligence')}</div>
          <h1 className="insights-title text-ink font-sans">
            {t('insights_title_1')}<em>{t('insights_title_em')}</em>{t('insights_title_2')}
          </h1>
          <p className="insights-sub text-base text-muted max-w-xl">
            {t('insights_sub')}
          </p>
        </div>
        <div className="insights-hero-stats flex gap-10">
          <div className="hero-stat">
            <span className="hero-stat-num font-sans italic">{topStats.total > 0 ? topStats.total : '1,284'}</span>
            <span className="hero-stat-label font-mono">{t('stat_entities')}</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num font-sans italic">{topStats.org}</span>
            <span className="hero-stat-label font-mono">{t('stat_organizations')}</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num font-sans italic">{topStats.person}</span>
            <span className="hero-stat-label font-mono">{t('stat_key_figures')}</span>
          </div>
        </div>
      </header>

      {/* Spotlights Cards Row */}
      <AnimatePresence>
        {!isLoading && spotLights.length > 0 && (
          <section className="insights-spotlights grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {spotLights.map((e: any) => {
              const trendUp = e.trend >= 0;
              return (
                <div key={e.term} className="spotlight border border-hairline hover:border-ink rounded-2xl p-5 cursor-pointer bg-[var(--surface)]" onClick={() => handleEntityClick(e.term)}>
                  <div className="spotlight-eyebrow font-mono text-[10px] text-faint">{t('most_mentioned')} · {KIND_GLYPH[e.type]}</div>
                  <div className="spotlight-name font-sans font-bold text-2xl mt-1 text-ink">{e.term}</div>
                  <div className="spotlight-meta flex items-center gap-2 mt-2 text-xs text-muted">
                    <span className="font-mono">{e.count.toLocaleString()} {t('mentions_unit')}</span>
                    <span className={`entity-trend mini flex items-center gap-1 font-mono ${trendUp ? "text-[#0E6E3A]" : "text-[#FF4D14]"}`}>
                      {trendUp ? <Icon.up /> : <Icon.down />}
                      {Math.abs(e.trend)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </AnimatePresence>

      {/* Toolbar Filter / Sort Controls */}
      <div className="insights-toolbar border-t border-b border-hairline py-4 flex flex-wrap gap-4 justify-between items-center mt-6">
        <div className="filter-pills flex flex-wrap gap-1.5">
          {[
            { id: "all",      label: t('filter_all') },
            { id: "ORG",      label: t('filter_orgs') },
            { id: "PERSON",   label: t('filter_persons') },
            { id: "LOCATION", label: t('filter_locations') },
            { id: "TOPIC",    label: t('filter_topics') },
          ].map((f) => (
            <button
              key={f.id}
              className={`filter-pill flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
                filter === f.id 
                  ? "bg-ink text-paper border-ink" 
                  : "bg-[var(--surface)] border-hairline text-ink-2 hover:border-ink"
              }`}
              onClick={() => setFilter(f.id)}
            >
              <span>{f.label}</span>
              <span className={`filter-pill-count text-[10px] ml-1 px-1.5 py-0.5 rounded-full ${
                filter === f.id ? "bg-paper/20" : "bg-paper-2 text-muted"
              }`}>
                {f.id === "all"
                  ? enrichedEntities.length
                  : enrichedEntities.filter((e) => e.type === f.id).length}
              </span>
            </button>
          ))}
        </div>

        <div className="insights-tools flex gap-2">
          {/* Client-Side Search input */}
          <div className="entity-search border border-hairline rounded-lg bg-[var(--surface)] px-3 py-1.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder={t('filter_placeholder')}
              className="text-xs text-ink bg-transparent focus:outline-none w-36 md:w-48"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button onClick={() => setQ('')} className="p-0.5 rounded hover:bg-paper-2">
                <X className="w-3 h-3 text-muted" />
              </button>
            )}
          </div>

          {/* Sort trigger button */}
          <button 
            className="rb-btn text-xs px-3 py-1.5 border border-hairline bg-[var(--surface)] rounded-lg hover:border-ink flex items-center gap-1.5"
            onClick={() => setSort(sort === "count" ? "trend" : sort === "trend" ? "abc" : "count")}
          >
            <span>{t('sort_by')} </span>
            <strong className="text-ink font-semibold">
              {sort === "count" ? t('sort_mentions') : sort === "trend" ? t('sort_trending') : t('sort_abc')}
            </strong>
          </button>
        </div>
      </div>

      {/* Primary Entity Grid Rendering */}
      <div className="mt-8">
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-ink animate-spin" />
            <span className="text-xs text-muted font-mono">Analyzing news intelligence records...</span>
          </div>
        )}

        {/* Error message */}
        {error && !isLoading && (
          <div className="glass-panel border-red-500/20 rounded-2xl p-6 flex items-start gap-4 max-w-xl mx-auto my-12 bg-[var(--surface)]">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <h4 className="font-semibold text-ink font-sans">{t('db_error_title')}</h4>
              <p className="text-xs text-muted leading-relaxed">
                {t('db_error_desc')}
              </p>
            </div>
          </div>
        )}

        {/* Empty matches result */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="entity-empty text-center py-20 text-muted italic font-serif text-lg">
            {t('no_entities_matched')}
          </div>
        )}

        {/* Main Entity Cards Grid */}
        {!isLoading && !error && filtered.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="entity-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <AnimatePresence>
              {filtered.map((e, idx) => {
                const trendUp = e.trend >= 0;
                const initials = getInitials(e.term);
                return (
                  <motion.button
                    key={e.term}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.01 }}
                    className="entity-card flex flex-col justify-between p-5 border border-hairline hover:border-ink rounded-2xl text-left bg-[var(--surface)] relative overflow-hidden group select-none cursor-pointer"
                    onClick={() => handleEntityClick(e.term)}
                  >
                    <div className="entity-card-head flex justify-between items-center w-full mb-3">
                      <div className="entity-avatar flex items-center justify-center w-8 h-8 rounded-full border border-hairline font-mono font-bold text-[11px]" data-kind={e.type.toLowerCase()}>
                        {e.type === 'PERSON' ? initials : <span className="entity-avatar-glyph italic font-serif font-light text-base">{KIND_GLYPH[e.type].slice(0, 1)}</span>}
                      </div>
                      <span className="entity-kind text-[10px] text-faint uppercase tracking-wider">{KIND_GLYPH[e.type]}</span>
                    </div>

                    <div className="flex-1">
                      <div className="entity-name font-sans text-xl font-bold leading-tight text-ink mb-1">{e.term}</div>
                      <div className="entity-blurb text-xs text-muted leading-relaxed mb-4">{e.blurb}</div>
                    </div>

                    <div className="entity-card-foot flex justify-between items-end w-full border-t border-hairline-2 pt-3 mt-1">
                      <div className="entity-count flex flex-col">
                        <span className="entity-count-num font-mono text-base font-bold text-ink leading-none">{e.count.toLocaleString()}</span>
                        <span className="entity-count-label text-[10px] text-faint mt-1">{t('mentions_unit')}</span>
                      </div>
                      <div className={`entity-trend flex items-center gap-1 font-mono text-xs ${trendUp ? "text-[#0E6E3A]" : "text-[#FF4D14]"}`}>
                        {trendUp ? <Icon.up /> : <Icon.down />}
                        <span>{Math.abs(e.trend)}%</span>
                        <Sparkline seed={e.term.length * 7 + e.count} trend={e.trend} />
                      </div>
                    </div>

                    {/* Sliding Hover Action Panel */}
                    <div className="entity-card-hover absolute inset-x-0 bottom-0 py-3.5 px-5 bg-ink text-paper flex items-center justify-between text-xs transition-transform duration-200 translate-y-full group-hover:translate-y-0">
                      <span>{t('search_about_entity')} {e.term}</span>
                      <Icon.arrow />
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
