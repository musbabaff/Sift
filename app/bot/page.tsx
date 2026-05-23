'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  Calendar, 
  Globe, 
  ArrowRight, 
  X, 
  Zap, 
  Link as LinkIcon, 
  ChevronUp, 
  ChevronDown, 
  Send, 
  Paperclip,
  RotateCcw
} from 'lucide-react';

// SiftMark Logo Component
function SiftMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className="sift-mark">
      <g stroke="currentColor" strokeLinecap="round">
        <line x1="6" y1="9" x2="26" y2="9" strokeWidth="2.4" />
        <line x1="6" y1="14" x2="26" y2="14" strokeWidth="1.8" />
        <line x1="6" y1="19" x2="26" y2="19" strokeWidth="1.3" />
        <line x1="6" y1="24" x2="26" y2="24" strokeWidth="0.8" />
      </g>
      <circle cx="22" cy="28" r="2" fill="var(--accent)" />
    </svg>
  );
}

// Static Sources Dictionary
const SIFT_SOURCES: Record<string, { name: string; type: string; country: string }> = {
  "oxu.az":      { name: "Oxu.az",      type: "news",        country: "AZ" },
  "trend.az":    { name: "Trend.az",    type: "wire",        country: "AZ" },
  "report.az":   { name: "Report.az",   type: "news",        country: "AZ" },
  "apa.az":      { name: "APA",         type: "wire",        country: "AZ" },
  "marja.az":    { name: "Marja.az",    type: "finance",     country: "AZ" },
  "socar.az":    { name: "SOCAR",       type: "corporate",   country: "AZ" },
  "cbar.az":     { name: "CBAR",        type: "regulator",   country: "AZ" },
  "interfax.ru": { name: "Interfax",    type: "wire",        country: "RU" },
  "tass.ru":     { name: "TASS",        type: "wire",        country: "RU" },
  "reuters.com": { name: "Reuters",     type: "wire",        country: "EN" },
  "ft.com":      { name: "Financial Times", type: "news",   country: "EN" },
  "bloomberg.com": { name: "Bloomberg", type: "news",        country: "EN" },
};

function LangTag({ lang }: { lang: string }) {
  const map: Record<string, string> = { az: "AZ", ru: "RU", en: "EN" };
  return <span className="lang-tag" data-lang={lang}>{map[lang] || lang.toUpperCase()}</span>;
}

function SourcePip({ id }: { id: string }) {
  const meta = SIFT_SOURCES[id];
  if (!meta) return <span className="source-pip-name font-mono">{id}</span>;
  const letter = meta.name.slice(0, 1);
  return (
    <span className="source-pip" title={meta.name}>
      <span className="source-pip-letter">{letter}</span>
      <span className="source-pip-name">{meta.name}</span>
    </span>
  );
}

function RelevanceRing({ score, size = 44, animate = true }: { score: number; size?: number; animate?: boolean }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(animate ? 0 : score);

  useEffect(() => {
    if (!animate) { setShown(score); return; }
    let raf: number, t0: number;
    const tick = (t: number) => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / 700);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(score * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, animate]);

  const dash = c * (shown / 100);
  return (
    <div className="rel-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--hairline)" strokeWidth="2.5" />
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--ink)" strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke 0.3s" }}
        />
      </svg>
      <span className="rel-ring-label">{shown}</span>
    </div>
  );
}

interface ScriptMessage {
  role: 'bot' | 'user';
  kind: 'system' | 'text' | 'interpret' | 'card' | 'actions';
  body: any;
}

const BOT_FLOW: ScriptMessage[] = [
  {
    role: "bot",
    kind: "system",
    body: {
      title: "@SiftNBot",
      sub: "Hybrid news search · 20,915 articles · AZ / RU / EN"
    }
  },
  {
    role: "bot",
    kind: "text",
    body: (
      <>
        <p className="mb-2"><strong>Welcome to Sift AI News Intelligence.</strong></p>
        <p className="mb-2">Type any search request in plain English, Azerbaijani or Russian. I’ll return the most relevant news with sources, dates and real-time hybrid scores.</p>
        <p className="tg-muted">Tip: include a date range or entity — e.g. <em>“SOCAR news on May 14”</em>.</p>
      </>
    ),
  },
  { role: "user", kind: "text", body: "SOCAR news on May 14" },
  {
    role: "bot",
    kind: "interpret",
    body: {
      topic: "SOCAR",
      date: "May 14, 2026",
      lang: "any",
      explain: "Searching 20,915 articles..."
    }
  },
  {
    role: "bot",
    kind: "card",
    body: {
      score: 96,
      lang: "az",
      source: "socar.az",
      date: "May 14",
      title: "SOCAR Türkiyədə yeni neft-kimya kompleksinin inşasına başladı",
      summary: "Petkim sahəsində 4.2 milyard dollarlıq genişlənmə layihəsinin təməlqoyma mərasimi keçirilib. Tikinti işləri 2029-cu ilədək tamamlanacaq.",
      kind: "Exact",
      kindNote: "Exact mention · Date match",
    },
  },
  {
    role: "bot",
    kind: "card",
    body: {
      score: 88,
      lang: "en",
      source: "ft.com",
      date: "May 11",
      title: "Azerbaijani gas exports to Europe rose 12% YoY in April",
      summary: "Pipeline volumes via TAP reached a record 2.4 bcm, supported by Italian and Bulgarian demand, according to SOCAR figures.",
      kind: "Semantic",
      kindNote: "SOCAR-related · gas exports",
    },
  },
  {
    role: "bot",
    kind: "actions",
    body: [
      { label: "📄 More results", primary: true },
      { label: "🏷️ Top entities" },
      { label: "🔁 New search" },
    ],
  },
];

function TelegramBubble({ msg, idx }: { msg: ScriptMessage; idx: number }) {
  const cls = "tg-bubble tg-bubble-" + msg.role + " tg-bubble-" + msg.kind;

  if (msg.kind === "system") {
    return (
      <div className="tg-system mb-4">
        <div className="tg-system-mark flex justify-center"><SiftMark size={36} /></div>
        <div className="tg-system-title font-sans font-bold text-lg mt-2">{msg.body.title}</div>
        <div className="tg-system-sub text-xs text-muted mt-1">{msg.body.sub}</div>
        <div className="tg-system-actions flex gap-2 justify-center mt-3">
          <button className="tg-kbd font-mono text-xs">/start</button>
          <button className="tg-kbd font-mono text-xs">/help</button>
        </div>
      </div>
    );
  }

  if (msg.kind === "interpret") {
    const c = msg.body;
    return (
      <div className={`${cls} mb-3`} style={{ animationDelay: `${idx * 80}ms` }}>
        <div className="tg-interpret">
          <div className="tg-interpret-row">
            <span className="tg-interpret-key">Topic</span>
            <span className="tg-interpret-val">{c.topic}</span>
          </div>
          <div className="tg-interpret-row">
            <span className="tg-interpret-key">Date</span>
            <span className="tg-interpret-val">{c.date}</span>
          </div>
          <div className="tg-interpret-row">
            <span className="tg-interpret-key">Lang</span>
            <span className="tg-interpret-val">{c.lang}</span>
          </div>
          <div className="tg-interpret-foot mt-1 text-[11px] font-medium text-faint italic">{c.explain}</div>
        </div>
      </div>
    );
  }

  if (msg.kind === "card") {
    const c = msg.body;
    return (
      <div className={`${cls} mb-3`} style={{ animationDelay: `${idx * 80}ms` }}>
        <div className="tg-card">
          <div className="tg-card-head">
            <RelevanceRing score={c.score} size={36} animate={false} />
            <div className="tg-card-head-info">
              <div className="tg-card-source flex items-center gap-1">
                <SourcePip id={c.source} />
                <LangTag lang={c.lang} />
                <span className="tg-card-date ml-1 text-faint text-[10px]">{c.date}</span>
              </div>
              <div className="tg-card-kind flex gap-1.5 items-center mt-1 text-xs">
                <span className={"match-kind match-kind-" + c.kind.toLowerCase()}>{c.kind}</span>
                <span className="tg-card-kindnote text-faint text-[10px]">{c.kindNote}</span>
              </div>
            </div>
          </div>
          <div className="tg-card-title text-sm font-sans font-bold text-ink mt-2" lang={c.lang}>{c.title}</div>
          <div className="tg-card-summary text-xs text-ink-2 leading-relaxed" lang={c.lang}>{c.summary}</div>
          <div className="tg-card-actions mt-1 flex flex-wrap gap-1.5">
            <button className="tg-kbd text-[11px] px-2.5 py-1">Open Link</button>
            <button className="tg-kbd text-[11px] px-2.5 py-1">Share</button>
          </div>
        </div>
      </div>
    );
  }

  if (msg.kind === "actions") {
    return (
      <div className={`${cls} mb-3`} style={{ animationDelay: `${idx * 80}ms` }}>
        <div className="tg-actions">
          {msg.body.map((a: any, i: number) => (
            <button key={i} className={"tg-kbd w-full text-center" + (a.primary ? " is-primary" : "")}>{a.label}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${cls} mb-2`} style={{ animationDelay: `${idx * 80}ms` }}>
      <div className="tg-bubble-inner leading-relaxed">{msg.body}</div>
    </div>
  );
}

export default function TelegramPage() {
  const [visible, setVisible] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let i = 1;
    const tick = () => {
      if (cancelled || i >= BOT_FLOW.length) return;
      const m = BOT_FLOW[i];
      const wait = m.role === "user" ? 900 : (m.kind === "card" ? 700 : 600);
      
      if (m.role === "bot" && BOT_FLOW[i - 1]?.role === "user") {
        setTyping(true);
        setTimeout(() => {
          if (cancelled) return;
          setTyping(false);
          setVisible((v) => v + 1);
          i++;
          setTimeout(tick, wait);
        }, 900);
      } else {
        setVisible((v) => v + 1);
        i++;
        setTimeout(tick, wait);
      }
    };
    const t = setTimeout(tick, 700);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visible, typing]);

  function restart() {
    setVisible(1);
    setTyping(false);
    let i = 1;
    const tick = () => {
      if (i >= BOT_FLOW.length) return;
      const m = BOT_FLOW[i];
      const wait = m.role === "user" ? 900 : (m.kind === "card" ? 700 : 600);
      if (m.role === "bot" && BOT_FLOW[i - 1]?.role === "user") {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setVisible((v) => v + 1);
          i++;
          setTimeout(tick, wait);
        }, 900);
      } else {
        setVisible((v) => v + 1);
        i++;
        setTimeout(tick, wait);
      }
    };
    setTimeout(tick, 400);
  }

  return (
    <div className="telegram-view max-w-7xl mx-auto w-full px-4 md:px-8 py-10">
      <div className="telegram-copy">
        <div className="tg-copy-eyebrow font-mono">Mobile · Telegram Interface</div>
        <h1 className="tg-copy-title font-sans">
          The same Sift engine,<br /><em>in your pocket</em>.
        </h1>
        <p className="tg-copy-sub text-base leading-relaxed text-muted">
          Sift features a fully integrated Telegram Bot. Direct message <strong>@SiftNBot</strong> to search our database of 20,915 multilingual articles in plain language.
        </p>
        <div className="tg-copy-list mb-8 flex flex-col gap-4">
          <div className="tg-copy-row">
            <div className="tg-copy-dot" />
            <div>
              <div className="tg-copy-row-h font-sans font-bold text-ink">Təbii Dil Axtarışları (Conversational NLP)</div>
              <div className="tg-copy-row-b text-muted">Type simple queries (AZ/RU/EN) like "SOCAR news on May 14" without strict syntax rules.</div>
            </div>
          </div>
          <div className="tg-copy-row">
            <div className="tg-copy-dot" />
            <div>
              <div className="tg-copy-row-h font-sans font-bold text-ink">Premium HTML Response Cards</div>
              <div className="tg-copy-row-b text-muted">Delivers clean, clickable headers, source labels, and precise hybrid score badges.</div>
            </div>
          </div>
          <div className="tg-copy-row">
            <div className="tg-copy-dot" />
            <div>
              <div className="tg-copy-row-h font-sans font-bold text-ink">Stateless Pagination Buttons</div>
              <div className="tg-copy-row-b text-muted">Page through results dynamically using optimized under-64-byte callbacks (ents / more).</div>
            </div>
          </div>
        </div>
        <div className="tg-copy-cta flex gap-3">
          <a 
            href="https://t.me/SiftNBot" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="primary-btn flex items-center gap-2"
          >
            <span>Open @SiftNBot</span>
            <Send className="w-4 h-4" />
          </a>
          <button className="ghost-btn flex items-center gap-2" onClick={restart}>
            <RotateCcw className="w-4 h-4" />
            <span>Replay demo</span>
          </button>
        </div>
      </div>

      {/* Simulated Smartphone Frame Mockup */}
      <div className="phone-frame shadow-xl border border-hairline">
        <div className="phone-notch" />
        <div className="phone-screen bg-paper flex flex-col h-full">
          {/* Mock Telegram Header */}
          <div className="tg-header bg-white">
            <button className="tg-back font-light text-muted">‹</button>
            <div className="tg-header-avatar"><SiftMark size={22} /></div>
            <div className="tg-header-info">
              <div className="tg-header-name text-ink font-semibold">SiftNBot</div>
              <div className="tg-header-status flex items-center gap-1.5 text-xs text-muted">
                <span className="tg-dot" /> bot · online
              </div>
            </div>
            <div className="tg-header-right text-muted font-bold">⋯</div>
          </div>

          {/* Chat thread area */}
          <div className="tg-thread flex-1 p-4 overflow-y-auto flex flex-col gap-2" ref={scrollRef}>
            <div className="tg-date mx-auto my-2">Today</div>
            {BOT_FLOW.slice(0, visible).map((m, i) => (
              <TelegramBubble key={i} msg={m} idx={i} />
            ))}
            {typing && (
              <div className="tg-bubble tg-bubble-bot tg-bubble-typing">
                <div className="tg-typing flex gap-1 items-center px-3.5 py-2.5">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {/* Composer Footer area */}
          <div className="tg-composer bg-white border-t border-hairline-2 px-3.5 py-2.5 flex items-center justify-between">
            <button className="tg-composer-btn"><Paperclip className="w-5 h-5 text-muted" /></button>
            <div className="tg-composer-input flex-1 bg-paper border border-hairline-2 rounded-full px-4 py-2 text-xs text-faint select-none">
              Message
            </div>
            <button className="tg-composer-btn tg-composer-send bg-ink text-paper w-8 h-8 rounded-full flex items-center justify-center">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="phone-home" />
      </div>
    </div>
  );
}
