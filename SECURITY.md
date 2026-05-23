# Security Policy

## 🔐 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes             |

## 🛡️ Secret Management

Sift follows strict secret management practices:

- **No secrets are committed** to version control — verified via automated `git grep` scans
- All sensitive values are stored in `.env.local` (gitignored)
- `.env.example` contains only placeholder variable names
- Server-side Supabase operations use `SUPABASE_SERVICE_ROLE_KEY` exclusively in API routes (never exposed to the client)
- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` follows Supabase's Row Level Security model and is safe for client-side exposure

## 🔍 Security Measures

1. **API Route Protection** — All server-side API routes (`/api/*`) handle errors gracefully without leaking stack traces or internal state
2. **Input Sanitization** — User search queries are parameterized through Supabase RPC calls (SQL injection safe)
3. **No Logging of Secrets** — Console logs never contain API keys, tokens, or credentials
4. **Rate Limiting** — OpenAI calls use `p-limit` concurrency control to prevent quota exhaustion
5. **Embedding Security** — Only top-K results are retrieved; the full dataset is never sent to any external API

## 📧 Reporting a Vulnerability

If you discover a security vulnerability in Sift, please report it responsibly:

1. **Email**: musbabaff@gmail.com
2. **Subject**: `[SECURITY] Sift Vulnerability Report`
3. **Include**: Steps to reproduce, potential impact, and suggested fix if possible

We will acknowledge receipt within 48 hours and provide a resolution timeline.

## ✅ Verification

You can verify the repository is clean by running:

```bash
git grep -iE "sk-|api_key=|token=|secret=|password=" -- ":(exclude).env.example" ":(exclude)*.md"
```

This should return **zero results** for any real credentials.
