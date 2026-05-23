# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-05-23

### 🎉 Initial Hackathon Release

#### Added
- **Hybrid Search Engine** — Two-stage retrieval combining dense vector similarity (pgvector HNSW) with sparse keyword matching (PostgreSQL GIN FTS), weighted 70/30 for optimal relevance.
- **NLP Query Parser** — GPT-4o-mini powered intent router that extracts topics, date ranges, categories, sources, and sentiment from natural language queries in Azerbaijani, Russian, and English.
- **Premium Editorial UI** — Warm paper design system with Instrument Serif typography, hairline borders, signal orange accents, glassmorphic cards, and Framer Motion micro-animations.
- **Entity Intelligence** — Fast regex-based multilingual tokenizer (Azerbaijani/Russian/English) with capitalization boosting, bigram extraction, and a single structured LLM call for proper-noun classification into ORG/PERSON/LOCATION/TOPIC types.
- **Insights Dashboard** (`/insights`) — Precomputed entity statistics with interactive cards sorted by type, linking back to live search.
- **Telegram Bot** — Grammy-powered conversational interface with HTML response cards, inline pagination buttons, and stateless callback protocol (64-byte Telegram limit compliant).
- **Data Ingestion Pipeline** — Batch-optimized Excel parser with automatic OpenAI embedding generation (100 rows/call), rate-limit backoff, chunked DB writes, and real-time cost tracking.
- **Webhook Production Route** — Serverless `/api/telegram` endpoint for Vercel deployment with Grammy HTTP adapter.
- **Analytical Sidebar** — Live search result analytics showing category distribution, source breakdown, date timeline, and relevance score histogram.

#### Performance
- Full corpus ingestion (20,915 articles): **~$0.13** OpenAI cost
- Entity classification (global): **<$0.01** OpenAI cost
- Search latency: **<20ms** average (hybrid RPC)
- Entity tokenization: **<10ms** (local regex, no LLM)

#### Tech Stack
- Next.js 15 (App Router, TypeScript strict)
- Tailwind CSS v4 + Framer Motion
- Supabase (PostgreSQL + pgvector)
- OpenAI API (text-embedding-3-small + gpt-4o-mini)
- Grammy (Telegram Bot Framework)

---

## [0.1.0] — 2026-05-20

### 🏗️ Project Scaffolding

#### Added
- Next.js 15 project initialization with TypeScript strict mode
- Supabase client/server/admin configuration
- Basic database schema with articles table and vector extension
- Initial `.env.example` and `.gitignore` setup
