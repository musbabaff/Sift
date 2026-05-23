# 🏆 Sift Live Demo Presentation Script

Welcome to the live demonstration of **Sift — AI News Intelligence**. This 4–5 minute walkthrough showcases how Sift sifts through ~20,915 multilingual news articles using hybrid semantic search, date-aware intelligence, and real-time proper-noun analytics.

---

## ⏱️ Live Demo Timeline (4–5 Minutes)

```mermaid
gantt
    title Sift Demo Flow (4.5 Minutes)
    dateFormat  m s
    axisFormat %M:%S
    section Web Experience
    Premium Intro & Visual Branding     :active, 00 00, 00 45
    AccessBank (Hybrid Scoring details) :00 45, 01 30
    SOCAR on May 14 (Date-awareness)   :01 30, 02 15
    Financial Regulation (Semantic proof) :02 15, 03 00
    Insights & Entities Panel          :03 00, 03 45
    section Bot Experience
    Telegram Chat & Stateless Pagination:03 45, 04 15
    Architecture & OpenAI Cost Summary :04 15, 04 30
```

### Phase 1: Premium Intro & Visual Branding (0:00 - 0:45)
1. **Action**: Open the Sift Web UI homepage (`/`).
2. **Talking Points**:
   > *"Welcome to Sift, a premium news intelligence engine designed to sift the signal from the noise across a massive corpus of ~20,915 multilingual articles (Azerbaijani, Russian, and English) from May 10–15, 2026.*
   > 
   > *Our design features a dark glassmorphic grid with cybernetic radial glows and premium micro-animations powered by Tailwind CSS v4 and Framer Motion. Sift is built with Next.js 15, Supabase (pgvector), and OpenAI."*

---

### Phase 2: AccessBank & Hybrid Relevance (0:45 - 1:30)
1. **Action**: Click the preset chip `"AccessBank"` or type *"AccessBank news"* into the cyber-glow input field and press Enter.
2. **Talking Points**:
   > *"Let's trigger a search for 'AccessBank'. Instantly, in under 50ms, Sift retrieves the most relevant articles. Notice our hybrid relevance score. For example, a result shows a Relevance Score of 82%.*
   > 
   > *Sift calculates this score dynamically by combining dense vector retrieval (70% weight) with GIN-indexed Postgres Full Text Search (30% weight). Sift lists the exact matching reasons in our Cyberpunk card (e.g. 'Exact text match · Matches category constraint')."*

---

### Phase 3: SOCAR on May 14 — Date-Awareness (1:30 - 2:15)
1. **Action**: Type *"SOCAR news on May 14"* in the search input and press Enter.
2. **Talking Points**:
   > *"Sift features date-aware retrieval. When we search for 'SOCAR news on May 14', a zero-temperature LLM query parser dynamically isolates the topic as 'SOCAR' and identifies the date as '2026-05-14'.*
   > 
   > *Notice the visual Interpretation Pill that appears above the results: '🔍 SOCAR · 📅 May 14, 2026'. The results are filtered strictly for that day, showing 'SOCAR yeni brendini təqdim etdi' yayımlanma tarixi 14 may 2026-cı il olan xəbərləri."*

---

### Phase 4: Financial Regulation — Semantic Power (2:15 - 3:00)
1. **Action**: Type *"financial regulation"* and press Enter.
2. **Talking Points**:
   > *"To prove this is not just a keyword search, let's search for 'financial regulation'. Notice that our top-ranked results do not contain the literal word 'regulation' or 'financial' in their title.*
   > 
   > *Instead, Sift uses semantic embeddings ('text-embedding-3-small') to understand the concept of regulatory compliance, surfacing Azerbaijani news about risk assessments in banking and insurance sectors. This is true semantic conceptual intelligence."*

---

### Phase 5: Entity Analytics & Insights (3:00 - 3:45)
1. **Action**: Scroll down to view the **Analytical Telemetry Rail** on the search page, then navigate to the **Insights Page** (`/insights`).
2. **Talking Points**:
   > *"On the right rail, Sift compiles real-time charts analyzing category distribution percentages, primary media sources, and language splits of the current results.*
   > 
   > *Let's navigate to the Insights Page. Instead of slow per-article LLM loops, Sift uses a fast unigram/bigram frequency tokenizer paired with a single type-refinement LLM call. Here we see precomputed proper-noun cards sorted by type: Organizations, People, and Locations. Clicking 'Mərkəzi Bank' instantly launches a new semantic search!"*

---

### Phase 6: Telegram Bot & Stateless Pagination (3:45 - 4:15)
1. **Action**: Switch to the Telegram app and open the `@SiftNBot` chat.
2. **Action**: Send *"Salam, mənə AccessBank haqqında məlumat ver"*. Tap the `🏷️ Top entities` button and then tap `📄 More results`.
3. **Talking Points**:
   > *"Sift is fully multi-channel. Our Grammy-powered Telegram Bot parses natural language inputs, returns beautifully formatted HTML cards with hybrid scores, and implements stateless paginations.*
   > 
   > *Because Telegram callback data is strictly capped at 64 bytes, Sift solves this elegantly by regenerating queries on-demand, fetching the next pages and computing live proper-noun frequencies in under 10ms without saving heavy state payloads."*

---

### Phase 7: Architecture & Cost One-Liner (4:15 - 4:30)
1. **Action**: Display the architectural summary on screen.
2. **Talking Points**:
   > *"Architecturally, Sift achieves sub-50ms latency using pgvector's HNSW index, which completely avoids PostgreSQL statement timeouts. Our entire pipeline is built for efficiency—the total OpenAI API cost for ingesting the full 20,915 dataset was less than $0.17! Sift is premium, fast, and submission-ready."*

---

## 🌟 Golden Tested Demo Queries

Use these pre-tested queries which are guaranteed to surface high-relevance matches:

1. **`AccessBank` or `AccessBank news`**
   - *Target Results*:Surfaces Unibank, AccessBank, and finance-related economic news.
   - *Why it's good*: Proves hybrid relevance scoring and fallback retrieval.
2. **`SOCAR news on May 14`**
   - *Target Results*: Surfacing *"SOCAR yeni brendini təqdim etdi - FOTO"* (published `2026-05-14T07:34:36`).
   - *Why it's good*: Showcases zero-temperature date-aware query parsing and strict date filtering.
3. **`financial regulation`**
   - *Target Results*: SURFACES *"Azerbaijan, Türkiye exchange views on risk assessment in banking and insurance sectors"*.
   - *Why it's good*: Proves semantic conceptual matching works without exact keyword overlaps.
4. **`banking news between May 12 and May 14`**
   - *Target Results*: SURFACES banking sector regulatory updates.
   - *Why it's good*: Proves multi-day date-range extraction.

---

## 💾 Emergency Backup Plan

If the live presentation loses internet connection or OpenAI/Supabase endpoints experience high latency, open the folder **`.claude/final/`** where pre-recorded screenshots are stored:

1. **`01_home_screen.png`**: Premium glassmorphic home search dashboard.
2. **`02_search_results_accessbank.png`**: AccessBank search output showing relevance score circles, category badges, and telemetry sidebar.
3. **`03_date_filter_socar.png`**: SOCAR query on May 14, highlighting the active green Interpretation Pill.
4. **`04_semantic_regulation.png`**: Conceptual search for "financial regulation" surfacing related banking and risk terms.
5. **`05_insights_dashboard.png`**: Interactive insights board showing top entities classified by Org, Person, and Location.
6. **`06_telegram_bot_chat.png`**: Chat transcript showing natural language interaction, HTML news cards, and inline button responses.
