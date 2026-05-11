<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Stack

- Next.js 16 (App Router) + React 19
- AI SDK v6 via Vercel AI Gateway (`AI_GATEWAY_API_KEY`, single key for Google/OpenAI/Anthropic)
- Auth.js v5 beta (`next-auth@5.0.0-beta`) with Drizzle adapter, Google OAuth
- Drizzle ORM + Neon Postgres (provisioned via Vercel Marketplace)
- Tailwind v4 + shadcn/ui (Radix primitives in `src/components/ui`)
- Package manager: pnpm

**Same warning applies to AI SDK v6 and Auth.js v5** — APIs differ from older versions in training data. Check `node_modules/<pkg>/` before assuming an API exists.

## Commands

```bash
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm lint                   # ESLint
pnpm drizzle-kit push       # Apply schema to DB (uses DATABASE_URL)
vercel env pull .env.local  # Sync env from Vercel after linking Neon
```

## Layout

- `src/app/api/` — route handlers (`detect`, `translate`, `variations`, `export`, `documents`, `auth`)
- `src/lib/db/schema.ts` — Drizzle schema (source of truth for tables)
- `src/lib/prompts.ts` — LLM prompts; edit here, not inline in routes
- `src/lib/models.ts` / `src/lib/languages.ts` — model & language registries
- `src/lib/auth.ts` — Auth.js v5 config
- `src/components/translator/` — main app UI

## Env

See `.env.example`. Required: `AI_GATEWAY_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
