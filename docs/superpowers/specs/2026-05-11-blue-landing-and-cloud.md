# Vertor — Blue Accent, Landing Page, and Cloud Sync

Date: 2026-05-11
Status: Draft → review

## Goals

Four changes, one focused implementation pass:

1. Replace the vermilion accent with a deep iron-gall ink blue, repo-wide.
2. Restructure the Simple / Advanced model selector as an always-visible segmented control.
3. Add an editorial landing page at `/`; move the translator app to `/app`.
4. Wire the existing Auth.js + Drizzle + Neon scaffold into a real sign-in flow with localStorage → cloud migration on first login.

We are **not** changing the LLM gateway — Vercel AI Gateway stays.

## Non-goals

- Multi-tenant features, billing, sharing, public docs.
- LiteLLM, OpenRouter, or any alternative gateway.
- Premium "model council / LLM-as-judge" feature (deferred).
- Mobile-first redesign (desktop primary; mobile must not break, but is not optimized).
- Email-magic-link auth or passkeys (Google only for v1).

---

## 1. Accent recolor

The current accent (`--vermilion`, OKLCH 0.55 0.18 32) is a saturated warm red. Replace with a deep iron-gall blue that reads as a writer's ink. Single accent, used the same way (cursor, focus rings, button shadow, active-state left rule, primary CTA shadow).

### Tokens

```css
/* light */
--ink: oklch(0.42 0.14 250);     /* iron-gall, deep blue */
--ring: var(--ink);
--highlight: oklch(0.42 0.14 250 / 0.16);

/* dark */
--ink: oklch(0.62 0.16 250);     /* lifted for contrast on dark */
--highlight: oklch(0.62 0.16 250 / 0.22);
```

### Mechanical rename

- CSS variables: `--vermilion` → `--ink`. `--color-vermilion` → `--color-ink`.
- Tailwind utility class references: `bg-vermilion`, `text-vermilion`, `decoration-vermilion`, `border-vermilion`, `bg-vermilion/8`, etc. → corresponding `*-ink` utilities.
- Class `.mark` color reference updated.
- Comments referencing "vermilion" or "proofreader's marks" updated to "ink" or "writer's mark."

### Files touched

- `src/app/globals.css` — token rename + theme inline reference.
- All `src/components/translator/*.tsx`, `src/components/theme-toggle.tsx`, `src/components/ui/popover.tsx` — utility class swap.

### Out of scope here

- Component restructuring. This is a recolor, not a redesign.

---

## 2. Simple / Advanced — segmented control

Replace the popover-based mode toggle with an always-visible segmented control in the topbar. Mode state still lives in `localStorage` (`vertor.mode.v1`).

### Visual

```
[ Simple  ⓘ ] [ Advanced ]
   active        inactive
```

- Two-segment pill, hairline border, ink-tinted active background, ink left-rule on the active segment removed (no longer needed — the segment itself is highlighted).
- A small `ⓘ` glyph (lucide `Info`, 1.5 stroke) sits inside the "Simple" label. Hovering opens a tooltip:
  > "Smart default. Gemini 3.1 Flash Lite — cheapest, fastest, fluent across long documents. Switch to Advanced to choose any model."
- "Advanced" tooltip:
  > "Pick any model — Gemini 3.1 Pro for nuance, Claude for literary voice, GPT-5 for technical prose."

### Behavior

- Clicking a segment switches mode (no popover, no confirmation).
- Switching to **Simple** forces all docs (current and future) to use `gemini-3.1-flash-lite-preview`.
- Switching to **Advanced** reveals the existing `ModelPicker` to the immediate left; current `doc.modelId` is honored.
- Tooltip uses the existing shadcn `Tooltip` primitive.

### Files

- New: replace `mode-toggle.tsx` body (component name kept; popover removed).
- `translator-app.tsx` — adjust topbar layout: segmented control next to model picker.

---

## 3. Landing page (route restructure)

Add a marketing landing page at `/`. Move the translator app to `/app`.

### Routes

```
/             →  app/(marketing)/page.tsx     ← new landing page
/app          →  app/app/page.tsx             ← current translator (moved)
/sign-in      →  app/sign-in/page.tsx         ← existing, restyled
/api/*        →  unchanged
```

A route group `(marketing)` keeps the marketing layout separate from the app layout (different chrome, no app-shell padding).

### Layout philosophy

Editorial-spare. Three full-height sections. Type carries the personality. No stock illustrations, no gradient blobs, no card-grid feature lists. Reads like a literary journal cover, not a SaaS landing.

### Section 1 — Hero

```
                              Vertor
            from vertere, Latin — to turn, to render, to translate

           A workspace for translators, writers, and editors.

                    [ Start writing ]   [ Sign in with Google ]

                                    ↓
```

- Wordmark in `Instrument Serif` italic at ~120px, centered.
- Latin etymology in small italic serif beneath, hairline-spaced.
- Single sentence positioning the tool.
- Two CTAs: primary "Start writing" goes to `/app` (anonymous local mode); secondary "Sign in with Google" triggers the OAuth flow then lands on `/app`.
- A small downward chevron at the bottom hinting at scroll.
- Background: warm parchment (light) / warm ink (dark), same palette as the app.
- Subtle blur-up reveal animation on first paint (we already have `.blur-up`).

### Section 2 — App preview

A single tall hero shot of the app (the translator interface with French → English content), centered with generous gutters. Three short annotations float beside it, each a single italic sentence:

- "Stream translations from any major model."
- "Click any word for three alternatives — refine without leaving the page."
- "Export to Word, PDF, LaTeX, Markdown."

Annotations use `Instrument Serif` italic, anchored with hairline rules to specific regions of the screenshot. The screenshot is a real PNG captured from the app — committed to `public/landing/preview.png` and `preview-dark.png` (auto-swapped via `prefers-color-scheme`).

### Section 3 — Closing

A single quote, then the CTA again.

```
   "A translator is a writer who writes in another's voice.
    The work is invisible — and yet, without it, nothing carries across."

                                — Vertor

           [ Start writing ]   [ Sign in with Google ]
```

(The quote attributed to "Vertor" is intentional house-tone; if you want a real attributed quote — Borges, Steiner, Eco — substitute and credit.)

### Footer

A single hairline above a one-line footer: `Vertor · 2026 · Built on Vercel`. No links to nav-bloat. No social icons. No newsletter capture.

### Header (marketing only)

Sparse top bar:
- Wordmark (links to `/`)
- Theme toggle (Sun/Moon)
- "Sign in" link (only if not authenticated)
- "Open app →" link (always)

### Files

- New: `src/app/(marketing)/layout.tsx` — minimal layout, no app shell.
- New: `src/app/(marketing)/page.tsx` — landing page.
- New: `src/components/landing/hero.tsx`, `preview.tsx`, `closing.tsx`, `marketing-header.tsx`.
- Move: `src/app/page.tsx` → `src/app/app/page.tsx`. Update server-side `auth()` call accordingly.
- New: `public/landing/preview.png`, `preview-dark.png` — generated once via the dev preview tool, hand-cropped.

### Out of scope

- Animated demo (would require recording / WebM). Static screenshot is enough.
- Dark/light side-by-side comparisons.
- Pricing, FAQ, "how it works" diagrams. The product is the demo.

---

## 4. Local → cloud sync

When a user signs in for the first time and they have local docs in `localStorage`, offer a one-click migration to the cloud.

### Behavior

```
On /app load (signed in):
  if (DB has 0 docs for this user) AND (localStorage has ≥1 docs):
    show banner at top of sidebar:
      "You have N local documents. Move them to your account?"
      [ Move to cloud ]   [ Keep local only ]   [ × ]

  on "Move to cloud":
    POST /api/documents/migrate { docs: [...localDocs] }
    → server inserts each as a new row owned by current user
    → on success: clear localStorage, reload docs from API
    → toast: "Moved N documents."

  on "Keep local only":
    set localStorage flag `vertor.migrate.dismissed = true`
    banner never reappears for this account
```

### Storage strategy after sign-in

- Signed in → all reads/writes go through `/api/documents` (existing). The localStorage adapter is bypassed.
- Signed out → unchanged (localStorage only).
- We do **not** sync new local-mode docs to the cloud automatically. The migration is a one-time, user-initiated action. (Avoids a class of "I didn't mean to upload that" bugs.)

### New API route

`POST /api/documents/migrate`
- Body: `{ docs: LocalDoc[] }`
- Auth: required.
- Behavior: insert all rows in a single transaction; preserve `createdAt`/`updatedAt` from local; assign new server-side `id`s.
- Returns: `{ inserted: number, documents: Document[] }`

### Files

- New: `src/components/translator/migrate-banner.tsx`
- New: `src/app/api/documents/migrate/route.ts`
- `translator-app.tsx` — wire the banner; switch read/write source based on session.
- New: `src/lib/storage-cloud.ts` — thin client wrapper around `/api/documents` matching the localStorage adapter's interface, so the translator app calls one of two implementations chosen at runtime.

### Edge cases

- User dismisses banner, signs out, signs back in: dismissed flag is in localStorage and account-keyed (`vertor.migrate.dismissed.{userId}`), so it sticks for that user only.
- User has docs in both local and cloud at first sign-in (rare — they signed in elsewhere first): we still show the banner. Migration appends; no merging by ID.
- Migration mid-flight failure: leave localStorage intact, show error toast. Idempotency is via user re-clicking — duplicates are an accepted risk for this MVP.

---

## 5. Setup runbook (Neon · Google OAuth · Vercel)

This belongs in the spec because the deploy steps are what actually make sign-in work.

### One-time setup

1. **Vercel link**
   ```
   pnpm add -g vercel@latest
   vercel link        # link this repo to a new or existing Vercel project named `vertor`
   ```

2. **Neon Postgres**
   - Vercel dashboard → Storage → Marketplace → Neon → connect.
   - Pick the `vertor` project.
   - `vercel env pull .env.local` to populate `DATABASE_URL`.
   - `pnpm drizzle-kit push` to create tables (`user`, `account`, `session`, `verificationToken`, `document`).

3. **Google OAuth**
   - Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client (Web).
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://vertor.vercel.app/api/auth/callback/google`
   - Copy Client ID + Secret into Vercel env vars (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`).
   - Generate `AUTH_SECRET`: `openssl rand -base64 32`. Set in Vercel env.
   - Set `NEXTAUTH_URL=https://vertor.vercel.app` in Production env only.
   - `vercel env pull .env.local` again to sync locally.

4. **Deploy**
   ```
   vercel deploy --prod
   ```

5. **Domain**
   - Vercel → Project → Domains → add `vertor.vercel.app` (or a custom domain later).

### Verification checklist

- `vertor.vercel.app/` shows the landing page.
- "Sign in with Google" round-trips and lands on `/app` with the user menu populated.
- A doc created while signed in appears in the Neon `document` table (verify in the Neon SQL editor).
- Signing out + signing back in restores the same docs.
- A doc created while signed out appears in `localStorage` only.
- Local-mode → sign-in shows the migration banner; clicking it moves the docs.

---

## Architecture notes

### Storage abstraction

```
TranslatorApp
  └─ docStore  (chosen by session)
       ├─ LocalDocStore     (lib/storage.ts — existing)
       └─ CloudDocStore     (lib/storage-cloud.ts — new)
```

Both implementations expose the same interface:

```ts
type DocStore = {
  list(): Promise<LocalDoc[]>;
  save(doc: LocalDoc): Promise<void>;
  delete(id: string): Promise<void>;
};
```

`TranslatorApp` picks the store based on `session.user`. This keeps the rest of the app unaware of where docs live.

### Why move to `/app` instead of conditionally rendering at `/`

Two reasons:
1. The marketing layout (no app shell, different chrome) is fundamentally different. Route groups are the cleanest expression of that in App Router.
2. SEO / sharing: people share `vertor.vercel.app/` and expect a landing page, not a translator with their last session's text loaded.

### Auth.js v5 already handles graceful disable

If env vars are missing, `authEnabled` is false and the sign-in routes return a fallback message. The landing page's "Sign in with Google" button checks `authEnabled` and either runs the flow or shows a tooltip "Sign-in not configured." This means the landing page works on a fresh clone without setup.

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Migration POST hits Vercel function timeout for users with hundreds of local docs | low | 300s default timeout; we batch insert in one query; realistically <100 docs |
| Google OAuth callback URL mismatch (localhost vs prod) | medium | Both URLs configured in step 3; documented in runbook |
| Drizzle schema drift between local + Neon | low | `drizzle-kit push` is the single source of truth; no manual SQL |
| Landing page screenshot goes stale after future UI changes | medium | One-line README note: re-capture via dev preview tool when topbar/sidebar materially changes |
| User clears localStorage between sign-in and clicking "migrate" | low | Banner state is read once on mount; if storage is empty we don't show it; user loses local docs (acceptable) |

---

## Implementation order

1. Accent recolor (mechanical, safe to do first; visible win)
2. Segmented mode control (small, isolated)
3. Storage abstraction refactor (no UI change; sets up for migration)
4. Landing page + route move (biggest visual change)
5. Migrate banner + endpoint
6. Setup runbook (live test against actual Vercel + Neon + Google)

Each step builds, tests, screenshots clean before moving on.
