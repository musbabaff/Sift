# Architecture

> Technical deep-dive into Sift's system design, data flow, and component interactions.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Homepage (/) │  │ Insights     │  │ Telegram Bot       │    │
│  │  Search UI    │  │ /insights    │  │ @SiftNBot          │    │
│  │  Results Rail │  │ Entity Cards │  │ Grammy Framework   │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘    │
│         │                 │                    │                │
└─────────┼─────────────────┼────────────────────┼────────────────┘
          │                 │                    │
┌─────────▼─────────────────▼────────────────────▼────────────────┐
│                       API LAYER (Next.js)                       │
│  ┌────────────────┐ ┌──────────────────┐ ┌──────────────────┐  │
│  │ /api/search    │ │ /api/entities/*  │ │ /api/telegram    │  │
│  │ Hybrid Search  │ │ Global + Result  │ │ Webhook Receiver │  │
│  └────────┬───────┘ └────────┬─────────┘ └────────┬─────────┘  │
│           │                  │                     │            │
└───────────┼──────────────────┼─────────────────────┼────────────┘
            │                  │                     │
┌───────────▼──────────────────▼─────────────────────▼────────────┐
│                     INTELLIGENCE LAYER                          │
│  ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐  │
│  │ Query Parser    │ │ Search Engine    │ │ Entity Engine   │  │
│  │ NLP Intent      │ │ Hybrid Retrieval │ │ Tokenizer + LLM │  │
│  │ (gpt-4o-mini)   │ │ (match_articles) │ │ (Regex + GPT)   │  │
│  └─────────────────┘ └────────┬─────────┘ └─────────────────┘  │
│                               │                                 │
└───────────────────────────────┼─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                      DATA LAYER                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Supabase (PostgreSQL + pgvector)             │  │
│  │  ┌─────────────┐ ┌────────────┐ ┌──────────────────┐     │  │
│  │  │ articles    │ │ entity_    │ │ match_articles   │     │  │
│  │  │ (20,915)    │ │ stats      │ │ RPC Function     │     │  │
│  │  │ HNSW Index  │ │ Precomputed│ │ Hybrid Scoring   │     │  │
│  │  │ GIN Index   │ │ Categories │ │ 0.7 sem + 0.3 kw │     │  │
│  │  └─────────────┘ └────────────┘ └──────────────────┘     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    OpenAI API                             │  │
│  │  text-embedding-3-small (1536-dim) │ gpt-4o-mini (chat)  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Search Request

```
User Query ("AccessBank news from May 14")
    │
    ▼
┌──────────────────────────────┐
│ 1. NLP Query Parser          │
│    - GPT-4o-mini structured  │
│    - Extracts: topic, dates, │
│      category, source, mood  │
│    - ~2-3s latency           │
└──────────┬───────────────────┘
           │ ParsedQuery JSON
           ▼
┌──────────────────────────────┐
│ 2. Embedding Generation      │
│    - text-embedding-3-small  │
│    - 1536-dimensional vector │
│    - ~200ms latency          │
└──────────┬───────────────────┘
           │ Float[1536]
           ▼
┌──────────────────────────────┐
│ 3. Hybrid RPC: match_articles│
│    Stage A: Semantic HNSW    │  ──► Top 150 by cosine distance
│    Stage B: Keyword GIN FTS  │  ──► Top 150 by ts_rank_cd
│    UNION + Dedup             │
│    Combined = 0.7·sem + 0.3·kw│
│    ORDER BY combined DESC    │
│    LIMIT 12                  │
│    - ~5-15ms latency         │
└──────────┬───────────────────┘
           │ Article[]
           ▼
┌──────────────────────────────┐
│ 4. Response Assembly         │
│    - Match reason annotation │
│    - Relevance % formatting  │
│    - Analytics aggregation   │
└──────────┬───────────────────┘
           │
           ▼
        Client UI / Telegram Bot
```

---

## 🏷️ Data Flow: Entity Extraction

```
Article Corpus (20,915 articles)
    │
    ▼
┌──────────────────────────────┐
│ 1. Regex Tokenizer (Local)   │
│    - Parse title + content   │
│    - Unigrams + Bigrams      │
│    - 3-language stopwords    │
│    - Capitalization 2.5x     │
│    - Execution: <100ms       │
└──────────┬───────────────────┘
           │ Top 80 candidates
           ▼
┌──────────────────────────────┐
│ 2. LLM Classification       │
│    - SINGLE GPT-4o-mini call │
│    - Structured JSON output  │
│    - Types: ORG, PERSON,     │
│      LOCATION, TOPIC         │
│    - Merges duplicates       │
│    - Cost: <$0.01            │
└──────────┬───────────────────┘
           │ ClassifiedEntity[]
           ▼
┌──────────────────────────────┐
│ 3. Persistence               │
│    - Upsert to entity_stats  │
│    - Indexed by name + type  │
│    - Cached for /insights    │
└──────────────────────────────┘
```

---

## 📁 Module Dependency Graph

```
app/page.tsx ──────────► /api/search ──────► lib/search/search.ts
                                                    │
                                                    ├──► lib/search/parse-query.ts
                                                    │         └──► lib/ai/openai.ts
                                                    │
                                                    └──► lib/supabase/admin.ts
                                                              └──► match_articles RPC

app/insights/page.tsx ─► /api/entities/global ──► lib/supabase/admin.ts
                                                       └──► entity_stats table

scripts/bot.ts ────────► lib/telegram/bot.ts
                              │
                              ├──► lib/search/search.ts (reused)
                              └──► lib/entities/frequency.ts (live tokenizer)

scripts/ingest.ts ─────► lib/ai/openai.ts (embeddings)
                         lib/supabase/admin.ts (batch insert)

scripts/compute-entities.ts ──► lib/entities/frequency.ts
                                lib/entities/refine.ts
                                lib/supabase/admin.ts
```

---

## 🗄️ Database Schema

| Table | Purpose | Key Indexes |
|:---|:---|:---|
| `articles` | 20,915 news articles with embeddings | HNSW (cosine), GIN (tsvector), B-tree (category, source, created_at) |
| `entity_stats` | Precomputed proper-noun statistics | Unique (name, type), B-tree (mention_count) |

### `match_articles` RPC Function
- **Input**: query embedding (vector), query text, optional filters (category, source, date range), match count, thresholds
- **Output**: Ranked articles with `semantic_score`, `keyword_score`, `combined_score`
- **Algorithm**: UNION of HNSW semantic candidates + GIN keyword candidates → deduplicate → weighted re-rank → limit

---

## ⚡ Performance Characteristics

| Operation | Latency | Cost |
|:---|:---|:---|
| NLP Query Parse | ~2-3s | ~$0.0001/query |
| Embedding Generation | ~200ms | ~$0.000002/query |
| Hybrid Search RPC | ~5-15ms | Free (Supabase) |
| Entity Tokenization | <10ms | Free (local regex) |
| Full Corpus Ingest | ~45 min | ~$0.13 |
| Entity Classification | ~5s | <$0.01 |
