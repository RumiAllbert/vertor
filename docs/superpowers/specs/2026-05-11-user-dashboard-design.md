# User Dashboard — Design

Date: 2026-05-11
Status: Proposed

## Goal

Give signed-in users a quiet, editorial dashboard at `/dashboard` that surfaces stats from their translation history. Aesthetic matches the rest of the app (hairline borders, display serif numerals, italic muted captions). No new dependencies.

## Non-goals

- Charts library, date pickers, filters, export.
- Tracking variations / word-replacement counts. Skipped for v1.
- Streaks, time-of-day patterns, milestone badges.
- Realtime updates. The page is static; refresh to update.

## Placement & entry points

- New route: `src/app/dashboard/page.tsx` (server component, `runtime = "nodejs"`).
- Auth-gated. Signed-out users are redirected to `/sign-in?callbackUrl=/dashboard`.
- If `authEnabled` is false (local mode) or DB is not configured, render a small "Dashboard requires sign-in" placeholder rather than throwing.
- Entry points added:
  - User dropdown ([src/components/translator/user-menu.tsx](../../../src/components/translator/user-menu.tsx)) — "Dashboard" item above "Sign out".
  - Marketing header ([src/components/landing/marketing-header.tsx](../../../src/components/landing/marketing-header.tsx)) — when signed in, "Dashboard" link appears alongside "Open app →".

## Layout

Single page, top to bottom, max-width container matching the rest of the app.

1. **Header strip**
   - Greeting: time-of-day aware ("Good evening, {firstName}").
   - Italic caption: *"Member since {Month YYYY} · {N} translations"*.

2. **KPI row** — four cards in a 2x2 (mobile) / 4-up (desktop) grid. Big serif numerals, hairline dividers, no icons.
   - Translations (count of documents)
   - Words translated (sum of source-text word counts)
   - Languages reached (distinct non-`auto` target langs)
   - Avg words per doc (rounded integer)

3. **Translator Personality card** (full-width, distinctive)
   - **Unlocked state:** display title (display serif, larger), one-sentence blurb, and a 3-word traits line (e.g. *"curious · multilingual · concise"*) in small italic muted text. Tiny caption: *"Refreshes every 5 translations · last updated {relative time}"*.
   - **Locked state (<5 docs):** italic muted text *"Unlocks after 5 translations — {N} to go"* with a thin hairline progress bar (filled width = `min(count, 5) / 5`).
   - **Failure fallback:** if generation has never succeeded, behave as locked. If a previous generation exists but refresh fails, keep showing the previous personality (silent failure).

4. **Languages reached**
   - Compact horizontal-bar list of top target languages. Each row: language name · count · % of total · thin bar (width = % of max). Pure CSS/SVG, no chart lib.
   - One line directly below: **Top pair** — *"EN → JA · 12 translations"*.

5. **Activity (last 30 days)**
   - Thin SVG bar sparkline, one bar per day, height proportional to count that day. To the right: total for the window, plus *"Most active on {Weekday}"* (most active day-of-week across the user's full history).

6. **Models used**
   - Small text list, one row per model: model display name · count · %.

7. **Highlights**
   - **Longest translation:** word count + clickable title that opens the doc (`/app?doc=<id>`).

8. **Recent translations**
   - Last 5 docs. Each row: title · `source→target` · relative time. Clicking opens the doc in `/app?doc=<id>`.

Empty-state for a user with zero documents: a single editorial paragraph encouraging them to translate something, with a link to `/app`. KPIs, Personality (locked), and lists are hidden.

## Data model changes

Add two columns to the `user` table in [src/lib/db/schema.ts](../../../src/lib/db/schema.ts):

```ts
personality: jsonb("personality").$type<{
  title: string;
  blurb: string;
  traits: [string, string, string];
  generatedAt: string; // ISO
} | null>(),
personalityDocCount: integer("personalityDocCount").notNull().default(0),
```

Applied with `pnpm drizzle-kit push`. No data migration needed; defaults are safe.

No other schema changes. All other stats come from the existing `document` table.

## Server-side computation

A single helper, `src/lib/stats.ts`, exports `getUserStats(userId: string)` returning:

```ts
type UserStats = {
  totalDocs: number;
  totalWords: number;
  languagesReached: number;
  avgWordsPerDoc: number;
  memberSince: Date; // users.createdAt
  topLanguages: { code: string; name: string; count: number; pct: number }[]; // top 6
  topPair: { source: string; target: string; count: number } | null;
  activityLast30: { day: string; count: number }[]; // length 30, oldest first
  mostActiveWeekday: number | null; // 0-6 (Sun-Sat), null if no data
  modelsUsed: { id: string; name: string; count: number; pct: number }[];
  longest: { id: string; title: string; words: number } | null;
  recent: { id: string; title: string; sourceLang: string; targetLang: string; updatedAt: Date }[]; // top 5
};
```

Implementation: one query that selects the fields needed (`id`, `title`, `sourceText`, `sourceLang`, `targetLang`, `modelId`, `createdAt`, `updatedAt`) for the user, ordered by `updatedAt desc`. All aggregations are computed in JS. At expected scale (hundreds of docs/user) this is comfortably under 10ms.

Word counting: `sourceText.trim().split(/\s+/).filter(Boolean).length`. Cached in JS on the returned doc to avoid re-splitting.

Language display names come from the existing `src/lib/languages.ts` registry; model names from `src/lib/models.ts`.

## Personality generation

New module `src/lib/personality.ts`, called from the dashboard page when needed.

Trigger: on dashboard render, if `totalDocs >= 5` AND `totalDocs >= user.personalityDocCount + 5`. Otherwise skip.

Flow:
1. Build a compact prompt with the user's last ~30 doc titles, their dominant target language(s), and most-used model.
2. Call AI SDK v6 `generateObject` with model `google/gemini-3.1-flash-lite` through the Vercel AI Gateway (uses existing `AI_GATEWAY_API_KEY`).
3. Schema (Zod): `{ title: string (≤30 chars), blurb: string (≤140 chars), traits: tuple of 3 strings (each ≤14 chars) }`.
4. On success, update `users.personality` and `users.personalityDocCount = totalDocs`.
5. On failure, log and continue. Do not block render.

Concurrency: a simple "skip if updated in the last 10 seconds" guard prevents double-generation when a user refreshes the dashboard repeatedly. (Check `personality.generatedAt`.)

Prompt is defined alongside other prompts in `src/lib/prompts.ts` for consistency.

## UI components

Kept inline in `src/app/dashboard/page.tsx` plus a few small server components in `src/app/dashboard/_components/`:

- `kpi-card.tsx` — label + big serif numeral.
- `personality-card.tsx` — handles unlocked/locked/empty states. Receives a `progress` value for the locked bar.
- `language-bars.tsx` — list with thin bars.
- `activity-sparkline.tsx` — 30-bar SVG, accepts `{day, count}[]`.
- `models-list.tsx`, `recent-list.tsx`, `highlight-row.tsx`.

All server components. No client interactivity needed.

## Styling

Reuses existing tokens (`hairline`, `ink`, `muted-foreground`, `card`, `display` serif). New utility classes are avoided; everything is composed from existing primitives in `src/app/globals.css` and Tailwind.

## Error handling

- No DB / no auth → friendly placeholder, no throw.
- Empty user → empty-state paragraph.
- Personality generation failure → silent fallback (previous value or locked state).
- Doc rows with malformed data → defensive guards on word counting and trimmed titles. No try/catch around the page render itself.

## Testing

- `src/lib/__tests__/stats.test.ts` — unit tests for the in-memory aggregations using fixture rows. Covers: empty user, single-doc user, top-pair tiebreaks, weekday distribution, longest-doc selection.
- No tests for personality generation (LLM call is mocked away; the generation module is thin glue).
- Manual verification: load `/dashboard` signed in with seeded docs; verify KPI numbers, language bars, sparkline, and that the personality card unlocks at the 5th doc.

## Build sequence

1. Schema: add columns, run `drizzle-kit push`.
2. `src/lib/stats.ts` + tests.
3. `src/app/dashboard/page.tsx` shell with KPIs, lists, recent, and locked personality card.
4. `src/lib/personality.ts` + prompt; wire generation into the page.
5. Add entry points in `user-menu.tsx` and `marketing-header.tsx`.
6. Visual polish pass in browser.

## Risks / open considerations

- Personality refresh cost is bounded but real (one Flash Lite call per 5 docs per user). Acceptable.
- `sourceText` can be large; we still need to select it for word counts. If this becomes a problem we can store a precomputed `sourceWordCount` column later. Out of scope for v1.
- Personality content is user-visible and LLM-generated. Prompt explicitly constrains it to a neutral, complimentary tone and forbids any reference to specific document contents beyond language/style observations.
