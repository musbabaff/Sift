# Sift — AI News Intelligence

> **"Sift the signal from the noise."**

Sift is a premium, high-speed, and intelligent news search and analysis platform built for the **Neurotime Hackathon Challenge**. It enables users to perform natural language semantic, keyword, and date-aware search across a dataset of ~20,915 multilingual news articles (Azerbaijani, Russian, and English) from May 10–15, 2026. 

Sift features a premium, warm editorial paper design system with displays of Instrument Serif italics, custom hairline borders, a signal accent of orange, and is powered by a hybrid retrieval engine utilizing **Supabase (pgvector)** and **OpenAI APIs**.

---

## 🛠️ Technology Stack
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, TypeScript strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) (Premium micro-animations)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + `pgvector` extension)
- **AI Integrations**: [OpenAI API](https://openai.com/) only
  - **Embeddings**: `text-embedding-3-small` (1536-dimensional, cheap and fast)
  - **Reasoning/Chat**: `gpt-4o-mini` (High intelligence, low-latency, budget-friendly)
- **Data Parsing**: `xlsx` (Excel parsing)
- **Concurrency Control**: `p-limit` (OpenAI rate-limit protection)

---

## 🧠 Hybrid Relevance Scoring Logic

To deliver precise results, Sift combines **dense vector retrieval (semantic search)** with **sparse term matching (keyword search)** inside the PostgreSQL engine via a custom Database RPC function (`match_articles`).

The hybrid score is calculated mathematically as:

$$\text{Combined Score} = (w_{\text{semantic}} \times \text{Semantic Score}) + (w_{\text{keyword}} \times \text{Keyword Score})$$

Where:
1. **Semantic Score**: Derived using cosine similarity (calculated as `1 - (embedding <=> query_embedding)`). Ranged from `-1.0` to `1.0` (typically `0.3` to `0.8` for standard matches).
2. **Keyword Score**: Derived using Postgres GIN-indexed full-text search (`ts_rank_cd`). The rank is capped at `1.0` using the SQL `least()` function to prevent keyword-stuffing anomalies from overpowering semantic intelligence.
3. **Weights**:
   - $w_{\text{semantic}} = 0.7$ (Focus on conceptual understanding and natural language intent)
   - $w_{\text{keyword}} = 0.3$ (Ensures exact names, numbers, or specific words are matched reliably)

The RPC also handles optional metadata-level filtering for **categories**, **sources**, and **date ranges** (date-aware retrieval) before computing ranks, making queries extremely fast.

---

## ⚙️ Installation & Setup

### 1. Environment Variables
Clone the `.env.example` file and create `.env.local` (ensure `.env.local` is never committed to Git):
```bash
cp .env.example .env.local
```

Populate the following variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_high_privilege_service_role_key
OPENAI_API_KEY=your_openai_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### 2. Database Schema
Execute the SQL statements inside `supabase_schema.sql` within your Supabase SQL Editor. This will:
1. Enable the `vector` extension.
2. Create the `articles` table.
3. Establish indices for embeddings (`hnsw` high-speed cosine distance), GIN full-text index (`search_tsv`), category, source, and date indexes.
4. Establish the automated `tsvector` update trigger.
5. Create the `match_articles` hybrid search RPC.

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Run the Data Ingest Pipeline
Place `news_data.xlsx` inside the root directory of this project.

To ingest data, run the TS ingestion script. The script includes automatic batching (100 rows per OpenAI call, 100 rows per Supabase insert) for complete resilience, a rate limit backoff retry handler, a chunked database wipe routine to avoid timeouts, and visual cost/progress tracking.

**For a small safe test-run (50 rows):**
```bash
npx tsx scripts/ingest.ts --limit 50
```

**For the full 20,915-row ingestion:**
```bash
npx tsx scripts/ingest.ts
```

**To wipe existing database rows and re-ingest:**
```bash
npx tsx scripts/ingest.ts --reset
```

### 5. Running the Application
To run in development mode:
```bash
pnpm dev
```

To build and check production compiles:
```bash
npx next build
```

---

## ⚠️ Known Limitations & Assumptions

1. **Multilingual FTS Configuration**: PostgreSQL's Full Text Search is configured using the `'simple'` dictionary. Because the dataset contains mixed Azerbaijani, Russian, and English articles, a stemmed language-specific index (like `english` or `russian`) would fail to stem Azerbaijani Latin terms correctly. The `'simple'` configuration splits terms uniformly without language bias, which is highly robust for hybrid searches when paired with semantic vectors.
2. **Category Standardization**: Category names are cleaned by removing leading/trailing spaces and collapsing extra space/tab characters. However, overlapping semantic categories (e.g. "Siyasət" and "Politics") are currently treated as separate categories unless unified at query time.
3. **OpenAI Cost Limits**: Ingesting the full dataset costs less than `$0.15` for embeddings (20,915 articles × ~300 tokens each = ~6.3M tokens at `$0.02 / 1M` tokens). A telemetric cost report is printed at the end of the ingestion run.
4. **Excel Date Representation**: Ingestion assumes dates in `news_data.xlsx` are either standard Excel date numbers or ISO string representations in the `created_at` column, falling back gracefully to the current date if parsing errors are encountered.

---

## 🏷️ Entity & Keyword Intelligence

Sift features a highly optimized multilingual proper-noun extraction and classification engine that works across Azerbaijani, Russian, and English articles.

### 1. Extraction Pipeline (Fast Tokenizer)
- **Tokenization**: Parses the article title + content, cleans punctuation, and preserves special letters (`ə`, `ı`, `ö`, `ğ`, `ü`, `ç`, `ş` + Cyrillic/English characters).
- **N-Grams**: Extracts both unigrams and bigrams (to catch names like "Mərkəzi Bank" or "İlham Əliyev").
- **Multilingual Stopwords**: Filters out standard grammar noise across all three languages, plus general numbers and news filler words (e.g. `xəbər`, `sayt`, `фото`).
- **Capitalization Boosting**: Proper nouns in Azerbaijani, Russian, and English are capitalized. Words or bigram sequences starting with uppercase letters (excluding sentence-starting positions) receive a **2.5x weight boost**.

### 2. LLM Type Refinement (Sub-Cent Cost)
Rather than executing slow, expensive LLM calls for every single article, Sift uses a **hybrid frequency + refinement model**:
1. The fast tokenizer aggregates candidate frequencies across the targeted corpus and selects the top ~80 candidates.
2. A single, highly structured JSON call to `gpt-4o-mini` is issued to classify these proper nouns into four strict types: `ORG` (Organization), `PERSON` (People), `LOCATION` (Places), or `TOPIC` (Concepts/Keywords), standardize casing, and merge duplicates (e.g. `socar` and `socar-ın` -> `SOCAR`).
3. Counts from the tokenizer are mapped back and summed for any merged variations.

### 3. Execution & Views
- **Global View**: Precomputes entities across the entire database into `entity_stats` using our CLI script:
  ```bash
  npx tsx scripts/compute-entities.ts
  ```
- **Live Search View**: Live-tokenizes search results inside `/api/entities/result` using the fast frequency tokenizer (<10ms), inheriting precomputed types dynamically.
- **Insights Page (`/insights`)**: A dedicated analytics dashboard presenting precomputed proper-noun cards sorted by type, linking directly back to search on click.

---

## 🤖 Telegram Bot (Natural Language Interface)

Sift features a fully integrated Telegram Bot built using the **Grammy** framework. It reuses the core search and entity extraction engines of the platform, enabling users to interact with Sift's ~20,915 articles using plain, natural language.

### 🌟 Bot Key Features

1. **Conversational Natural Language Interface**: 
   - No rigid slash-commands are required for searches. Users can type queries in plain language (Azerbaijani, Russian, or English), e.g. *"AccessBank news from May 11 to 14"* or *"What's happening with SOCAR in Russian?"*.
   - A date-aware OpenAI parser interprets the user's intent, isolates dates, categories, and sources, and maps them to fast metadata filters automatically.
2. **Premium HTML Response Cards**:
   - Results are styled as highly readable HTML cards in Telegram, containing:
     - Clickable headline links.
     - Badges for source domains, language, and precise publication times.
     - Highly visible relevance percentages (hybrid scores).
     - Condensed text snippets (with HTML tags stripped).
3. **Cyberpunk Glassmorphic Inline Buttons**:
   - `🏷️ Top entities`: Performs live proper-noun tokenization on the retrieved results and lists the top 8 extracted proper nouns and their mention counts instantly (<10ms).
   - `📄 More results`: Standard pagination is supported. Clicking this button dynamically performs a paginated query and displays results 6–10, 11–15, etc.
   - `🔁 New search`: Prompts the user on starting a new search inquiry.
4. **Stateless Pagination Protocol**:
   - Telegram callback buttons are strictly capped at a **64-byte payload limit**. Sift solves this by encoding a regenerative callback pattern (e.g., `more:1:AccessBank` and `ents:AccessBank`), which dynamically re-fetches and tokenizes search results on-click rather than storing heavy state payloads.

### ⚙️ How to Setup and Run the Telegram Bot

#### Step 1: Create a Telegram Bot
1. Open Telegram and search for the official `@BotFather`.
2. Send the `/newbot` command and follow the instructions to name your bot and choose a username.
3. BotFather will provide your **API Access Token** (e.g. `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).

#### Step 2: Configure Environment Variables
Open your `.env.local` file and add the Telegram Token:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

#### Step 3: Run the Bot Locally (Long-Polling Mode)
During development or local evaluation, you can launch the bot in long-polling mode. Run the script:
```bash
npx tsx scripts/bot.ts
```
The console will output:
```
----------------------------------------------------
              SIFT TELEGRAM BOT ENGINE              
----------------------------------------------------
Starting Sift bot local long-polling...
Telegram Bot Polling has started successfully. Listening for chats...
```
Now, open Telegram and click **Start** (or send `/start`) to begin searching interactively!

#### Step 4: Webhook Mode (Production)
For production deployments (e.g. Vercel or custom cloud platforms), Sift includes a built-in webhook receiver route at `app/api/telegram/route.ts` which uses Grammy's standard HTTP adapter.
1. Deploy Sift to your public URL (e.g. `https://sift-neurotime.vercel.app`).
2. Set your Telegram webhook by visiting the following URL in your web browser (replacing `<TOKEN>` and `<DOMAIN>`):
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<DOMAIN>/api/telegram`
3. Sift will now process all incoming Telegram messages serverlessly!

---

## 📽️ Live Demonstration Flow & Tested Golden Queries

For a complete, step-by-step 4–5 minute presentation script with exact talking points and emergency backup screenshots, see the **[DEMO_SCRIPT.md](file:///d:/Projects/Sift/DEMO_SCRIPT.md)** file.

Here is a quick summary of what to demonstrate:

1. **Brand Impression**: Open the homepage. Highlight the elegant warm editorial paper styling, display serif italics, signal orange accents, custom hairline borders, and smooth micro-animations.
2. **AccessBank (Hybrid Scoring)**: Search for *"AccessBank"* to demonstrate hybrid relevance scores (combining cosine vector similarity and PostgreSQL GIN full-text index) and rule-based matching reasons (e.g. *Exact text match*).
3. **SOCAR on May 14 (Date-Awareness)**: Search for *"SOCAR news on May 14"*. Show how the GPT-4o-mini intent-router parses dates dynamically and highlights them in the green **Interpretation Pill**, filtering results to that exact day.
4. **Financial Regulation (Semantic Matching)**: Search for *"financial regulation"*. Prove semantic retrieval by showing how Sift matches articles containing concepts of risk management, banking, and insurance compliance without requiring the literal word "regulation".
5. **Entity Intelligence**: Go to the **Insights Page (`/insights`)** to view precomputed Organizations, People, and Locations. Click *"Mərkəzi Bank"* to instantly trigger a new semantic search.
6. **Telegram Bot (`@SiftNBot`)**: Send conversational queries to the Grammy-powered bot. Tap `🏷️ Top entities` to calculate real-time frequencies and `📄 More results` to trigger stateless, state-regenerating paginations under Telegram's 64-byte callback limit.

