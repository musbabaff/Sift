# Contributing to Sift

Thank you for your interest in contributing to Sift! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18.x
- **pnpm** (recommended) or npm
- **Supabase** account with a project configured
- **OpenAI** API key

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/musbabaff/Sift.git
   cd Sift
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Fill in all required values in `.env.local`.

4. **Set up the database**
   Execute the SQL in `supabase_schema.sql` in your Supabase SQL Editor.

5. **Ingest sample data** (optional, for testing)
   ```bash
   npx tsx scripts/ingest.ts --limit 50
   ```

6. **Start the dev server**
   ```bash
   pnpm dev
   ```

## 📁 Project Structure

```
Sift/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── search/         # Hybrid search endpoint
│   │   ├── entities/       # Entity extraction endpoints
│   │   └── telegram/       # Telegram webhook receiver
│   ├── bot/                # Bot simulator page
│   ├── insights/           # Entity analytics dashboard
│   └── page.tsx            # Main search homepage
├── components/             # Shared React components
├── lib/                    # Core business logic
│   ├── ai/                 # OpenAI client configuration
│   ├── entities/           # Entity extraction & classification
│   ├── search/             # Hybrid search engine & query parser
│   ├── supabase/           # Database client configurations
│   └── telegram/           # Grammy bot instance
├── scripts/                # CLI tools (ingest, entities, bot)
├── supabase_schema.sql     # Complete database schema
└── public/                 # Static assets
```

## 🔒 Security Rules

- **NEVER** commit API keys, tokens, or secrets
- Always use `.env.local` for sensitive configuration
- Verify with `git grep -iE "sk-|api_key=|token="` before pushing
- All `.env*` files (except `.env.example`) are gitignored

## 🧪 Testing

### Build Verification
```bash
npx next build
```
The project must compile with **zero TypeScript errors**.

### Manual Testing Checklist
- [ ] Homepage loads with search UI
- [ ] Search returns results with relevance scores
- [ ] Date-aware queries filter correctly
- [ ] Insights page displays entity cards
- [ ] Telegram bot responds to messages (requires bot token)

## 📝 Code Style

- **TypeScript** strict mode — no `any` types
- **Imports** — explicit named imports for all dependencies
- **Logging** — use structured `console.log` with `[Module]` prefixes
- **Error handling** — wrap all async operations in try/catch

## 🌐 Multilingual Support

Sift processes content in **Azerbaijani**, **Russian**, and **English**. When contributing:
- Use the `'simple'` PostgreSQL text search configuration (not language-specific)
- Maintain stopword lists in `lib/entities/stopwords.ts` for all three languages
- Test with queries in all supported languages

## 💡 Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and ensure `npx next build` passes
4. Commit with a descriptive message
5. Push and open a Pull Request

## 📜 License

By contributing to Sift, you agree that your contributions will be licensed under the [MIT License](LICENSE).
