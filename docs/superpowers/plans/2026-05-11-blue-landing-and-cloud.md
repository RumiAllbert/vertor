# Vertor — Blue Accent, Landing Page & Cloud Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four scoped changes: (1) recolor accent vermilion → ink-blue, (2) replace Simple/Advanced popover with a segmented control, (3) add an editorial landing page at `/` and move the translator to `/app`, (4) wire localStorage → Neon migration on first sign-in.

**Architecture:** Frontend changes are token + utility-class swaps with one new route group. The migration introduces a small storage abstraction (`DocStore` interface) with two implementations (local / cloud) chosen at runtime by session presence. A new `POST /api/documents/migrate` endpoint inserts a batch of local docs into Neon under the signed-in user.

**Tech Stack:** Next.js 16 App Router · TypeScript · Tailwind v4 · shadcn-style primitives · AI SDK v6 (Vercel Gateway) · Auth.js v5 · Drizzle + Neon Postgres · Vitest (added in Task 3 for the new logic).

**Spec:** [docs/superpowers/specs/2026-05-11-blue-landing-and-cloud.md](../specs/2026-05-11-blue-landing-and-cloud.md)

---

## File map

**Recolor (Task 1) — modify only**
- `src/app/globals.css` — rename `--vermilion` → `--ink`; same for theme-inline.
- `src/components/translator/translator-app.tsx` — utility class swap
- `src/components/translator/sidebar.tsx` — utility class swap
- `src/components/translator/mode-toggle.tsx` — utility class swap (rewritten in Task 2 anyway)
- `src/components/translator/variations-popover.tsx` — utility class swap
- `src/components/translator/export-menu.tsx` — utility class swap
- `src/components/translator/user-menu.tsx` — utility class swap

**Mode toggle (Task 2) — modify**
- `src/components/translator/mode-toggle.tsx` — replace popover with segmented control + tooltips
- `src/components/translator/translator-app.tsx` — adjust topbar order

**Storage abstraction (Task 3) — create + modify**
- Create: `src/lib/doc-store.ts` — `DocStore` interface + `LocalDocStore` (extracted from current `storage.ts`)
- Create: `src/lib/cloud-doc-store.ts` — `CloudDocStore` calling `/api/documents`
- Create: `src/lib/__tests__/local-doc-store.test.ts`
- Create: `src/lib/__tests__/cloud-doc-store.test.ts`
- Modify: `src/lib/storage.ts` — re-export from `doc-store.ts` for backward compat (kept thin)
- Modify: `src/components/translator/translator-app.tsx` — pick store based on `session.user`
- Create: `vitest.config.ts`
- Modify: `package.json` — add vitest deps + `test` script

**Landing page (Task 4) — create + move**
- Move: `src/app/page.tsx` → `src/app/app/page.tsx`
- Create: `src/app/(marketing)/layout.tsx`
- Create: `src/app/(marketing)/page.tsx`
- Create: `src/components/landing/marketing-header.tsx`
- Create: `src/components/landing/hero.tsx`
- Create: `src/components/landing/soft-aurora.tsx` — WebGL aurora background (React Bits, tuned to ink palette)
- Create: `src/components/landing/soft-aurora.css`
- Create: `src/components/landing/preview.tsx`
- Create: `src/components/landing/closing.tsx`
- Create: `public/landing/preview.png`, `public/landing/preview-dark.png` (committed binaries)
- Add dep: `ogl`

**Migration (Task 5) — create + modify**
- Create: `src/app/api/documents/migrate/route.ts`
- Create: `src/app/api/documents/__tests__/migrate.test.ts`
- Create: `src/components/translator/migrate-banner.tsx`
- Modify: `src/components/translator/translator-app.tsx` — render banner above sidebar list when conditions met
- Modify: `src/components/translator/sidebar.tsx` — accept optional `banner` slot

**Setup runbook (Task 6) — verify, no new code**
- `.env.example` (verify still accurate)
- Manual run of `vercel link`, `vercel env pull`, `pnpm drizzle-kit push`, `vercel deploy --prod`

---

## Verification model

This project does not currently have a test runner. Tests are added in Task 3 only for the new logic (storage interface, migration endpoint). UI changes are verified by:

1. `pnpm exec next build` (TypeScript + bundle correctness)
2. Browser preview screenshot via the dev preview tool
3. Console-error log check

Each task ends with a verification step + commit.

---

## Task 1: Recolor vermilion → ink

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/translator/translator-app.tsx`
- Modify: `src/components/translator/sidebar.tsx`
- Modify: `src/components/translator/variations-popover.tsx`
- Modify: `src/components/translator/export-menu.tsx`
- Modify: `src/components/translator/user-menu.tsx`
- Modify: `src/components/translator/mode-toggle.tsx`

### Step 1.1: Update CSS tokens

- [ ] In `src/app/globals.css`, find the `:root { ... }` block and replace these lines:

```css
  --ring: oklch(0.55 0.16 30);             /* vermilion */
  --vermilion: oklch(0.55 0.18 32);        /* sole accent */
  --highlight: oklch(0.55 0.18 32 / 0.18);
```

with:

```css
  --ring: oklch(0.42 0.14 250);            /* iron-gall ink */
  --ink: oklch(0.42 0.14 250);             /* sole accent */
  --highlight: oklch(0.42 0.14 250 / 0.16);
```

- [ ] In the same file, find the `.dark { ... }` block and replace:

```css
  --ring: oklch(0.65 0.16 30);
  --vermilion: oklch(0.68 0.16 30);
  --highlight: oklch(0.68 0.16 30 / 0.22);
```

with:

```css
  --ring: oklch(0.62 0.16 250);
  --ink: oklch(0.62 0.16 250);
  --highlight: oklch(0.62 0.16 250 / 0.22);
```

- [ ] In the same file, find the `@theme inline { ... }` block and replace:

```css
  --color-vermilion: var(--vermilion);
```

with:

```css
  --color-ink: var(--ink);
```

- [ ] Update CSS comments referencing "vermilion" or "proofreader's marks." Find:

```css
/* Selection — proofreader's vermilion at low opacity */
```

Replace with:

```css
/* Selection — writer's ink at low opacity */
```

Find:

```css
/* Proofreader's mark — used for the live indicator */
```

Replace with:

```css
/* Writer's mark — used for the live indicator */
```

### Step 1.2: Verify all files compile against the renamed token

- [ ] Run a search to confirm no source file still references `vermilion`:

```bash
grep -rn "vermilion" src/
```

Expected output: matches **only in component files we'll update next**, no other.

### Step 1.3: Swap utility classes in `translator-app.tsx`

- [ ] Open `src/components/translator/translator-app.tsx`. Replace every occurrence of these strings (in this order, to avoid partial-match issues):

| Find | Replace |
|---|---|
| `bg-vermilion` | `bg-ink` |
| `text-vermilion` | `text-ink` |
| `border-vermilion` | `border-ink` |
| `decoration-vermilion` | `decoration-ink` |
| `shadow-[2px_2px_0_var(--vermilion)]` | `shadow-[2px_2px_0_var(--ink)]` |
| `shadow-[3px_3px_0_var(--vermilion)]` | `shadow-[3px_3px_0_var(--ink)]` |
| `shadow-[1px_1px_0_var(--vermilion)]` | `shadow-[1px_1px_0_var(--ink)]` |
| `var(--vermilion)` | `var(--ink)` |

You can use this sed one-liner instead:

```bash
sed -i '' \
  -e 's/bg-vermilion/bg-ink/g' \
  -e 's/text-vermilion/text-ink/g' \
  -e 's/border-vermilion/border-ink/g' \
  -e 's/decoration-vermilion/decoration-ink/g' \
  -e 's/var(--vermilion)/var(--ink)/g' \
  src/components/translator/translator-app.tsx
```

### Step 1.4: Repeat for the other component files

- [ ] Run the same sed across the remaining component files:

```bash
sed -i '' \
  -e 's/bg-vermilion/bg-ink/g' \
  -e 's/text-vermilion/text-ink/g' \
  -e 's/border-vermilion/border-ink/g' \
  -e 's/decoration-vermilion/decoration-ink/g' \
  -e 's/var(--vermilion)/var(--ink)/g' \
  src/components/translator/sidebar.tsx \
  src/components/translator/variations-popover.tsx \
  src/components/translator/export-menu.tsx \
  src/components/translator/user-menu.tsx \
  src/components/translator/mode-toggle.tsx
```

### Step 1.5: Confirm zero vermilion references remain

- [ ] Run:

```bash
grep -rn "vermilion" src/
```

Expected: no matches.

### Step 1.6: Build verification

- [ ] Run:

```bash
pnpm exec next build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`, `✓ Generating static pages`, no TypeScript errors.

### Step 1.7: Visual verification

- [ ] Ensure dev server is running (`pnpm dev` or via the preview tool's launch.json).
- [ ] Take a screenshot at 1440×900, light mode. Confirm the Translate button shadow is **deep blue** (not red) and the active sidebar item's left rule is blue.
- [ ] Repeat in dark mode.

### Step 1.8: Commit

```bash
git add src/app/globals.css src/components/translator/ && \
git -c commit.gpgsign=false commit -m "Recolor accent: vermilion to ink-blue

Replace the warm-red proofreader's mark accent with a deep iron-gall
blue (writer's ink). Mechanical token rename; no behavioral changes."
```

---

## Task 2: Segmented Simple/Advanced control

**Files:**
- Modify: `src/components/translator/mode-toggle.tsx` (full rewrite)
- Modify: `src/components/translator/translator-app.tsx` (topbar slot adjustment)

### Step 2.1: Rewrite `mode-toggle.tsx`

- [ ] Replace the entire contents of `src/components/translator/mode-toggle.tsx` with:

```tsx
"use client";
import * as React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type Mode = "simple" | "advanced";

const KEY = "vertor.mode.v1";

export function useMode(): [Mode, (m: Mode) => void] {
  const [mode, setMode] = React.useState<Mode>("simple");
  React.useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "advanced" || v === "simple") setMode(v);
    } catch {}
  }, []);
  const set = React.useCallback((m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {}
  }, []);
  return [mode, set];
}

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Model mode"
      className="inline-flex h-7 items-center rounded-sm border border-hairline bg-background p-0.5 text-[11.5px]"
    >
      <SegmentButton
        active={mode === "simple"}
        onClick={() => onChange("simple")}
      >
        Simple
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="ml-1 inline-flex h-3 w-3 items-center justify-center text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Info className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-[11px] leading-snug italic">
            Smart default. Gemini 3.1 Flash Lite — cheapest, fastest, fluent across long documents. Switch to Advanced to choose any model.
          </TooltipContent>
        </Tooltip>
      </SegmentButton>
      <SegmentButton
        active={mode === "advanced"}
        onClick={() => onChange("advanced")}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span>Advanced</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-[11px] leading-snug italic">
            Pick any model — Gemini 3.1 Pro for nuance, Claude for literary voice, GPT-5 for technical prose.
          </TooltipContent>
        </Tooltip>
      </SegmentButton>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-6 items-center gap-0.5 rounded-[3px] px-2.5 transition-colors",
        active
          ? "bg-ink/10 text-foreground shadow-[inset_0_0_0_1px_oklch(var(--ink)/0.15)]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
```

### Step 2.2: Adjust `translator-app.tsx` topbar

- [ ] Open `src/components/translator/translator-app.tsx`. Locate the topbar section that renders the model picker (look for `{mode === "advanced" && (`).
- [ ] Verify the conditional block looks like:

```tsx
{mode === "advanced" && (
  <ModelPicker
    value={doc.modelId}
    onChange={(id) => updateDoc({ modelId: id })}
    className="h-7 w-auto min-w-[180px] border-0 px-1.5 text-[12px] shadow-none hover:bg-accent/50"
  />
)}
```

This is unchanged from the previous version — keep as-is.

- [ ] In the right-side cluster (`<div className="ml-auto flex items-center gap-2">`), the `<ModeToggle>` is currently placed there. Move it to **after** the ModelPicker block (still in the main row) so it sits next to the model context. The new structure of that area:

Find:

```tsx
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle mode={mode} onChange={setMode} />
            <span className="h-5 w-px bg-hairline" />
            <ThemeToggle />
            <UserMenu session={session} />
          </div>
```

Replace with:

```tsx
          <ModeToggle mode={mode} onChange={setMode} />

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu session={session} />
          </div>
```

Now the segmented control sits inline with the model controls (Translate button, Export, instruction), and the right cluster only carries theme + user menu.

### Step 2.3: Build verification

- [ ] Run:

```bash
pnpm exec next build 2>&1 | tail -15
```

Expected: success.

### Step 2.4: Visual verification

- [ ] Reload the dev preview at 1440×900.
- [ ] Confirm: a small bordered pill `[Simple ⓘ] [Advanced]` appears in the topbar. Hovering `ⓘ` shows the Flash Lite explanation tooltip.
- [ ] Click "Advanced" — model picker appears to the left of the segmented control.
- [ ] Click "Simple" — model picker disappears, doc.modelId gets reset to flash-lite (verify by clicking Advanced again — picker shows Flash Lite selected).

### Step 2.5: Commit

```bash
git add src/components/translator/mode-toggle.tsx src/components/translator/translator-app.tsx && \
git -c commit.gpgsign=false commit -m "Replace mode popover with segmented control

Always-visible Simple/Advanced pill toggle in the topbar with inline
info tooltips explaining each. Removes the extra click and the popover
component."
```

---

## Task 3: Storage abstraction + Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/doc-store.ts`
- Create: `src/lib/cloud-doc-store.ts`
- Create: `src/lib/__tests__/local-doc-store.test.ts`
- Create: `src/lib/__tests__/cloud-doc-store.test.ts`
- Modify: `src/lib/storage.ts` (becomes thin re-export)
- Modify: `src/components/translator/translator-app.tsx` (pick store at runtime)
- Modify: `package.json` (add deps + script)

### Step 3.1: Install Vitest

- [ ] Run:

```bash
pnpm add -D vitest @testing-library/jest-dom happy-dom
```

Expected: deps installed, no errors.

### Step 3.2: Add test script to `package.json`

- [ ] Open `package.json`. Find the `"scripts"` block:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
```

Replace with:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

### Step 3.3: Create `vitest.config.ts`

- [ ] Create `vitest.config.ts` at the repo root with:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["src/**/__tests__/**/*.test.ts", "src/**/__tests__/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Step 3.4: Define the `DocStore` interface

- [ ] Create `src/lib/doc-store.ts` with:

```ts
import { nanoid } from "nanoid";

export type LocalDoc = {
  id: string;
  title: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
};

export interface DocStore {
  list(): Promise<LocalDoc[]>;
  save(doc: LocalDoc): Promise<void>;
  remove(id: string): Promise<void>;
}

const KEY = "vertor.docs.v1";

export class LocalDocStore implements DocStore {
  async list(): Promise<LocalDoc[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as LocalDoc[];
      return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
    } catch {
      return [];
    }
  }

  async save(doc: LocalDoc): Promise<void> {
    if (typeof window === "undefined") return;
    const all = await this.list();
    const idx = all.findIndex((d) => d.id === doc.id);
    if (idx >= 0) all[idx] = doc;
    else all.unshift(doc);
    localStorage.setItem(KEY, JSON.stringify(all));
  }

  async remove(id: string): Promise<void> {
    if (typeof window === "undefined") return;
    const remaining = (await this.list()).filter((d) => d.id !== id);
    localStorage.setItem(KEY, JSON.stringify(remaining));
  }
}

export function newLocalDoc(partial?: Partial<LocalDoc>): LocalDoc {
  const now = Date.now();
  return {
    id: nanoid(),
    title: "Untitled",
    sourceText: "",
    translatedText: "",
    sourceLang: "auto",
    targetLang: "en",
    modelId: "gemini-3.1-flash-lite-preview",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function deriveTitle(source: string): string {
  const firstLine = source.split(/\n/).find((l) => l.trim().length > 0);
  if (!firstLine) return "Untitled";
  const trimmed = firstLine.trim().replace(/^#+\s*/, "");
  return trimmed.length > 60 ? trimmed.slice(0, 57) + "…" : trimmed;
}
```

### Step 3.5: Write `LocalDocStore` failing test

- [ ] Create `src/lib/__tests__/local-doc-store.test.ts` with:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { LocalDocStore, newLocalDoc } from "../doc-store";

describe("LocalDocStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty list when storage is empty", async () => {
    const store = new LocalDocStore();
    expect(await store.list()).toEqual([]);
  });

  it("saves and lists a doc", async () => {
    const store = new LocalDocStore();
    const doc = newLocalDoc({ title: "Hello" });
    await store.save(doc);
    const all = await store.list();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(doc.id);
  });

  it("orders docs by updatedAt descending", async () => {
    const store = new LocalDocStore();
    const a = newLocalDoc({ title: "A" });
    a.updatedAt = 1000;
    const b = newLocalDoc({ title: "B" });
    b.updatedAt = 2000;
    await store.save(a);
    await store.save(b);
    const all = await store.list();
    expect(all.map((d) => d.title)).toEqual(["B", "A"]);
  });

  it("updates an existing doc by id", async () => {
    const store = new LocalDocStore();
    const doc = newLocalDoc({ title: "First" });
    await store.save(doc);
    await store.save({ ...doc, title: "Updated" });
    const all = await store.list();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Updated");
  });

  it("removes a doc by id", async () => {
    const store = new LocalDocStore();
    const a = newLocalDoc({ title: "A" });
    const b = newLocalDoc({ title: "B" });
    await store.save(a);
    await store.save(b);
    await store.remove(a.id);
    const all = await store.list();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(b.id);
  });
});
```

### Step 3.6: Run the test — expect pass

- [ ] Run:

```bash
pnpm test
```

Expected: 5 passing tests in `local-doc-store.test.ts`. (The implementation already exists in Step 3.4; tests verify it.)

### Step 3.7: Create `CloudDocStore`

- [ ] Create `src/lib/cloud-doc-store.ts` with:

```ts
import type { DocStore, LocalDoc } from "./doc-store";

type ServerDoc = {
  id: string;
  title: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  modelId: string;
  createdAt: string; // ISO from API
  updatedAt: string;
};

function toLocalDoc(s: ServerDoc): LocalDoc {
  return {
    id: s.id,
    title: s.title,
    sourceText: s.sourceText,
    translatedText: s.translatedText,
    sourceLang: s.sourceLang,
    targetLang: s.targetLang,
    modelId: s.modelId,
    createdAt: new Date(s.createdAt).getTime(),
    updatedAt: new Date(s.updatedAt).getTime(),
  };
}

export class CloudDocStore implements DocStore {
  constructor(private fetcher: typeof fetch = fetch.bind(globalThis)) {}

  async list(): Promise<LocalDoc[]> {
    const res = await this.fetcher("/api/documents");
    if (!res.ok) return [];
    const { documents } = (await res.json()) as { documents: ServerDoc[] };
    return documents.map(toLocalDoc);
  }

  async save(doc: LocalDoc): Promise<void> {
    // Existence is determined by attempting PATCH first. If 404, POST.
    const patchRes = await this.fetcher(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: doc.title,
        sourceText: doc.sourceText,
        translatedText: doc.translatedText,
        sourceLang: doc.sourceLang,
        targetLang: doc.targetLang,
        modelId: doc.modelId,
      }),
    });
    if (patchRes.status === 404 || patchRes.status === 401) {
      await this.fetcher("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: doc.title,
          sourceText: doc.sourceText,
          translatedText: doc.translatedText,
          sourceLang: doc.sourceLang,
          targetLang: doc.targetLang,
          modelId: doc.modelId,
        }),
      });
    }
  }

  async remove(id: string): Promise<void> {
    await this.fetcher(`/api/documents/${id}`, { method: "DELETE" });
  }
}
```

### Step 3.8: Write `CloudDocStore` failing test

- [ ] Create `src/lib/__tests__/cloud-doc-store.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { CloudDocStore } from "../cloud-doc-store";
import { newLocalDoc } from "../doc-store";

function mockFetcher(impl: (url: string, init?: RequestInit) => Response) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    impl(typeof input === "string" ? input : input.toString(), init),
  ) as unknown as typeof fetch;
}

describe("CloudDocStore", () => {
  it("lists docs from /api/documents", async () => {
    const fetcher = mockFetcher(() =>
      new Response(
        JSON.stringify({
          documents: [
            {
              id: "x",
              title: "T",
              sourceText: "s",
              translatedText: "t",
              sourceLang: "auto",
              targetLang: "en",
              modelId: "m",
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-02T00:00:00Z",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const store = new CloudDocStore(fetcher);
    const docs = await store.list();
    expect(docs).toHaveLength(1);
    expect(docs[0].id).toBe("x");
    expect(docs[0].updatedAt).toBe(new Date("2026-01-02T00:00:00Z").getTime());
  });

  it("returns empty list when API fails", async () => {
    const fetcher = mockFetcher(() => new Response(null, { status: 500 }));
    const store = new CloudDocStore(fetcher);
    expect(await store.list()).toEqual([]);
  });

  it("save: PATCH first; on 404 falls back to POST", async () => {
    const calls: { url: string; method?: string }[] = [];
    const fetcher = mockFetcher((url, init) => {
      calls.push({ url, method: init?.method });
      if (init?.method === "PATCH") return new Response(null, { status: 404 });
      return new Response(JSON.stringify({ document: { id: "x" } }), { status: 200 });
    });
    const store = new CloudDocStore(fetcher);
    await store.save(newLocalDoc({ id: "missing" }));
    expect(calls.map((c) => c.method)).toEqual(["PATCH", "POST"]);
  });

  it("save: PATCH success does not POST", async () => {
    const calls: { method?: string }[] = [];
    const fetcher = mockFetcher((_, init) => {
      calls.push({ method: init?.method });
      return new Response(null, { status: 200 });
    });
    const store = new CloudDocStore(fetcher);
    await store.save(newLocalDoc());
    expect(calls.map((c) => c.method)).toEqual(["PATCH"]);
  });

  it("remove DELETEs the doc", async () => {
    const calls: { url: string; method?: string }[] = [];
    const fetcher = mockFetcher((url, init) => {
      calls.push({ url, method: init?.method });
      return new Response(null, { status: 200 });
    });
    const store = new CloudDocStore(fetcher);
    await store.remove("abc");
    expect(calls).toEqual([{ url: "/api/documents/abc", method: "DELETE" }]);
  });
});
```

### Step 3.9: Run the tests — expect pass

- [ ] Run:

```bash
pnpm test
```

Expected: all tests pass (5 local + 5 cloud).

### Step 3.10: Delete the old `storage.ts`

The old module's only consumer is `translator-app.tsx`, which we're updating in the next step to import from `doc-store.ts` directly. No need for a compatibility shim.

- [ ] Delete:

```bash
rm src/lib/storage.ts
```

- [ ] Confirm nothing else imports it:

```bash
grep -rn "from \"@/lib/storage\"" src/ || echo "no other importers"
```

Expected output: `no other importers`.

### Step 3.11: Update `translator-app.tsx` to use a `DocStore`

- [ ] In `src/components/translator/translator-app.tsx`, replace the imports block at the top:

Find:

```tsx
import {
  deleteLocalDoc,
  deriveTitle,
  listLocalDocs,
  newLocalDoc,
  saveLocalDoc,
  type LocalDoc,
} from "@/lib/storage";
```

Replace with:

```tsx
import {
  deriveTitle,
  newLocalDoc,
  type LocalDoc,
  LocalDocStore,
  type DocStore,
} from "@/lib/doc-store";
import { CloudDocStore } from "@/lib/cloud-doc-store";
```

- [ ] Inside `TranslatorApp`, near the top of the component body (right after `const [docs, setDocs] = ...`), add:

```tsx
  const store: DocStore = React.useMemo(
    () => (session.user ? new CloudDocStore() : new LocalDocStore()),
    [session.user],
  );
```

- [ ] Replace every `listLocalDocs()` call with `store.list()`. Every `saveLocalDoc(...)` with `store.save(...)`. Every `deleteLocalDoc(...)` with `store.remove(...)`. Each becomes async — wrap in `await` or `.then()`.

The two effects affected look approximately like this after the edit:

```tsx
  React.useEffect(() => {
    store.list().then(setDocs);
  }, [store]);

  React.useEffect(() => {
    if (!doc.sourceText.trim() && !doc.translatedText.trim()) return;
    const t = setTimeout(async () => {
      const updated: LocalDoc = {
        ...doc,
        title: doc.title === "Untitled" && doc.sourceText ? deriveTitle(doc.sourceText) : doc.title,
        updatedAt: Date.now(),
      };
      await store.save(updated);
      setDocs(await store.list());
    }, 600);
    return () => clearTimeout(t);
  }, [doc, store]);

  React.useEffect(() => {
    store.list().then((all) => {
      if (all.length > 0 && !doc.sourceText && !doc.translatedText) {
        setDoc(all[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);
```

The `removeDocument` handler becomes:

```tsx
  const removeDocument = async (id: string) => {
    await store.remove(id);
    setDocs(await store.list());
    if (doc.id === id) newDocument();
  };
```

### Step 3.12: Build verification

- [ ] Run:

```bash
pnpm exec next build 2>&1 | tail -15
```

Expected: success.

### Step 3.13: Visual verification (no behavior change)

- [ ] Reload preview. App should look and behave identically to before in local mode.
- [ ] Type some text in the source pane → confirm it persists across reload (storage path still works).

### Step 3.14: Commit

```bash
git add vitest.config.ts package.json pnpm-lock.yaml src/lib/ src/components/translator/translator-app.tsx && \
git -c commit.gpgsign=false commit -m "Introduce DocStore abstraction with local + cloud backends

Adds Vitest. Extracts a DocStore interface so the translator app can
switch between localStorage (signed out) and the API-backed Neon store
(signed in) at runtime. No user-visible behavior change; sets up the
migration in the next task."
```

---

## Task 4: Landing page + route move

**Files:**
- Move: `src/app/page.tsx` → `src/app/app/page.tsx`
- Create: `src/app/(marketing)/layout.tsx`
- Create: `src/app/(marketing)/page.tsx`
- Create: `src/components/landing/marketing-header.tsx`
- Create: `src/components/landing/hero.tsx`
- Create: `src/components/landing/preview.tsx`
- Create: `src/components/landing/closing.tsx`
- Create: `public/landing/preview.png`, `preview-dark.png`

### Step 4.0: Install ogl

- [ ] Run:

```bash
pnpm add ogl
```

Expected: dep added, no peer warnings.

### Step 4.1: Move the translator route

- [ ] Run:

```bash
mkdir -p src/app/app && git mv src/app/page.tsx src/app/app/page.tsx
```

- [ ] Verify the file's content is unchanged (still calls `<TranslatorApp session=...>`).

### Step 4.2: Marketing header component

- [ ] Create `src/components/landing/marketing-header.tsx`:

```tsx
"use client";
import * as React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SessionInfo } from "@/components/translator/user-menu";

export function MarketingHeader({ session }: { session: SessionInfo }) {
  return (
    <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 px-8 py-6 md:px-12">
      <Link href="/" className="display text-[20px] leading-none">
        Vertor
      </Link>
      <nav className="flex items-center gap-5 text-[12px]">
        <ThemeToggle />
        {session.enabled && !session.user && (
          <a
            href="/api/auth/signin"
            className="text-muted-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-ink"
          >
            Sign in
          </a>
        )}
        <Link
          href="/app"
          className="text-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink"
        >
          Open app →
        </Link>
      </nav>
    </header>
  );
}
```

### Step 4.3a: SoftAurora CSS

- [ ] Create `src/components/landing/soft-aurora.css`:

```css
.soft-aurora-container {
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.soft-aurora-container canvas {
  display: block;
  width: 100%;
  height: 100%;
}
```

### Step 4.3b: SoftAurora component (typed, ink palette)

- [ ] Create `src/components/landing/soft-aurora.tsx`. This is the React Bits component adapted to TypeScript with the props we'll actually use:

```tsx
"use client";
import * as React from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";
import "./soft-aurora.css";

type Props = {
  speed?: number;
  scale?: number;
  brightness?: number;
  color1?: string;
  color2?: string;
  noiseFrequency?: number;
  noiseAmplitude?: number;
  bandHeight?: number;
  bandSpread?: number;
  octaveDecay?: number;
  layerOffset?: number;
  colorSpeed?: number;
  enableMouseInteraction?: boolean;
  mouseInfluence?: number;
};

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

const vertexShader = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform float uSpeed;
uniform float uScale;
uniform float uBrightness;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uNoiseFreq;
uniform float uNoiseAmp;
uniform float uBandHeight;
uniform float uBandSpread;
uniform float uOctaveDecay;
uniform float uLayerOffset;
uniform float uColorSpeed;
uniform vec2 uMouse;
uniform float uMouseInfluence;
uniform bool uEnableMouse;

#define TAU 6.28318

vec3 gradientHash(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 234.6)),
    dot(p, vec3(269.5, 183.3, 198.3)),
    dot(p, vec3(169.5, 283.3, 156.9))
  );
  vec3 h = fract(sin(p) * 43758.5453123);
  float phi = acos(2.0 * h.x - 1.0);
  float theta = TAU * h.y;
  return vec3(cos(theta) * sin(phi), sin(theta) * cos(phi), cos(phi));
}

float quinticSmooth(float t) {
  float t2 = t * t;
  float t3 = t * t2;
  return 6.0 * t3 * t2 - 15.0 * t2 * t2 + 10.0 * t3;
}

vec3 cosineGradient(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(TAU * (c * t + d));
}

float perlin3D(float amplitude, float frequency, float px, float py, float pz) {
  float x = px * frequency;
  float y = py * frequency;

  float fx = floor(x); float fy = floor(y); float fz = floor(pz);
  float cx = ceil(x);  float cy = ceil(y);  float cz = ceil(pz);

  vec3 g000 = gradientHash(vec3(fx, fy, fz));
  vec3 g100 = gradientHash(vec3(cx, fy, fz));
  vec3 g010 = gradientHash(vec3(fx, cy, fz));
  vec3 g110 = gradientHash(vec3(cx, cy, fz));
  vec3 g001 = gradientHash(vec3(fx, fy, cz));
  vec3 g101 = gradientHash(vec3(cx, fy, cz));
  vec3 g011 = gradientHash(vec3(fx, cy, cz));
  vec3 g111 = gradientHash(vec3(cx, cy, cz));

  float d000 = dot(g000, vec3(x - fx, y - fy, pz - fz));
  float d100 = dot(g100, vec3(x - cx, y - fy, pz - fz));
  float d010 = dot(g010, vec3(x - fx, y - cy, pz - fz));
  float d110 = dot(g110, vec3(x - cx, y - cy, pz - fz));
  float d001 = dot(g001, vec3(x - fx, y - fy, pz - cz));
  float d101 = dot(g101, vec3(x - cx, y - fy, pz - cz));
  float d011 = dot(g011, vec3(x - fx, y - cy, pz - cz));
  float d111 = dot(g111, vec3(x - cx, y - cy, pz - cz));

  float sx = quinticSmooth(x - fx);
  float sy = quinticSmooth(y - fy);
  float sz = quinticSmooth(pz - fz);

  float lx00 = mix(d000, d100, sx);
  float lx10 = mix(d010, d110, sx);
  float lx01 = mix(d001, d101, sx);
  float lx11 = mix(d011, d111, sx);

  float ly0 = mix(lx00, lx10, sy);
  float ly1 = mix(lx01, lx11, sy);

  return amplitude * mix(ly0, ly1, sz);
}

float auroraGlow(float t, vec2 shift) {
  vec2 uv = gl_FragCoord.xy / uResolution.y;
  uv += shift;

  float noiseVal = 0.0;
  float freq = uNoiseFreq;
  float amp = uNoiseAmp;
  vec2 samplePos = uv * uScale;

  for (float i = 0.0; i < 3.0; i += 1.0) {
    noiseVal += perlin3D(amp, freq, samplePos.x, samplePos.y, t);
    amp *= uOctaveDecay;
    freq *= 2.0;
  }

  float yBand = uv.y * 10.0 - uBandHeight * 10.0;
  return 0.3 * max(exp(uBandSpread * (1.0 - 1.1 * abs(noiseVal + yBand))), 0.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float t = uSpeed * 0.4 * uTime;

  vec2 shift = vec2(0.0);
  if (uEnableMouse) {
    shift = (uMouse - 0.5) * uMouseInfluence;
  }

  vec3 col = vec3(0.0);
  col += 0.99 * auroraGlow(t, shift) * cosineGradient(uv.x + uTime * uSpeed * 0.2 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.3, 0.20, 0.20)) * uColor1;
  col += 0.99 * auroraGlow(t + uLayerOffset, shift) * cosineGradient(uv.x + uTime * uSpeed * 0.1 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.20, 0.25)) * uColor2;

  col *= uBrightness;
  float alpha = clamp(length(col), 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

export function SoftAurora({
  speed = 0.4,
  scale = 1.2,
  brightness = 0.55,
  color1 = "#7a9ec8",
  color2 = "#1e3a5f",
  noiseFrequency = 1.6,
  noiseAmplitude = 1.0,
  bandHeight = 0.45,
  bandSpread = 1.6,
  octaveDecay = 0.22,
  layerOffset = 0.85,
  colorSpeed = 0.6,
  enableMouseInteraction = true,
  mouseInfluence = 0.08,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    let program: Program | null = null;
    const currentMouse: [number, number] = [0.5, 0.5];
    let targetMouse: [number, number] = [0.5, 0.5];

    function handleMouseMove(e: MouseEvent) {
      const rect = gl.canvas.getBoundingClientRect();
      targetMouse = [
        (e.clientX - rect.left) / rect.width,
        1.0 - (e.clientY - rect.top) / rect.height,
      ];
    }

    function handleMouseLeave() {
      targetMouse = [0.5, 0.5];
    }

    function resize() {
      renderer.setSize(container!.offsetWidth, container!.offsetHeight);
      if (program) {
        program.uniforms.uResolution.value = [
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / gl.canvas.height,
        ];
      }
    }
    window.addEventListener("resize", resize);
    resize();

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height],
        },
        uSpeed: { value: speed },
        uScale: { value: scale },
        uBrightness: { value: brightness },
        uColor1: { value: hexToVec3(color1) },
        uColor2: { value: hexToVec3(color2) },
        uNoiseFreq: { value: noiseFrequency },
        uNoiseAmp: { value: noiseAmplitude },
        uBandHeight: { value: bandHeight },
        uBandSpread: { value: bandSpread },
        uOctaveDecay: { value: octaveDecay },
        uLayerOffset: { value: layerOffset },
        uColorSpeed: { value: colorSpeed },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseInfluence: { value: mouseInfluence },
        uEnableMouse: { value: enableMouseInteraction },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    container.appendChild(gl.canvas);

    if (enableMouseInteraction) {
      gl.canvas.addEventListener("mousemove", handleMouseMove);
      gl.canvas.addEventListener("mouseleave", handleMouseLeave);
    }

    let animationFrameId = 0;

    function update(time: number) {
      animationFrameId = requestAnimationFrame(update);
      program!.uniforms.uTime.value = time * 0.001;

      if (enableMouseInteraction) {
        currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
        program!.uniforms.uMouse.value[0] = currentMouse[0];
        program!.uniforms.uMouse.value[1] = currentMouse[1];
      } else {
        program!.uniforms.uMouse.value[0] = 0.5;
        program!.uniforms.uMouse.value[1] = 0.5;
      }

      renderer.render({ scene: mesh });
    }
    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      if (enableMouseInteraction) {
        gl.canvas.removeEventListener("mousemove", handleMouseMove);
        gl.canvas.removeEventListener("mouseleave", handleMouseLeave);
      }
      container.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [
    speed, scale, brightness, color1, color2, noiseFrequency, noiseAmplitude,
    bandHeight, bandSpread, octaveDecay, layerOffset, colorSpeed,
    enableMouseInteraction, mouseInfluence,
  ]);

  return <div ref={containerRef} className="soft-aurora-container" />;
}
```

**Why these defaults differ from React Bits' shipped values:** the demo uses a magenta-on-white palette at full brightness — pure SaaS aesthetic. Vertor's defaults pull two ink-blues (`#7a9ec8` pale, `#1e3a5f` deep) at `brightness: 0.55` and `speed: 0.4`, with `mouseInfluence: 0.08` (was 0.25). The result is a slow, low-saturation wash that sits behind the wordmark rather than competing with it.

### Step 4.3c: Hero component (with aurora background)

- [ ] Create `src/components/landing/hero.tsx`:

```tsx
import Link from "next/link";
import { SoftAurora } from "./soft-aurora";

export function Hero({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Aurora background — masked so it fades into the page at top/bottom edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
        }}
      >
        <SoftAurora />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <h1
          className="display blur-up text-[14vw] leading-[0.95] md:text-[120px] md:leading-[0.95]"
          style={{ animationDelay: "60ms" }}
        >
          Vertor
        </h1>
        <p
          className="display blur-up mt-6 max-w-[40ch] text-[15px] italic text-muted-foreground md:text-[17px]"
          style={{ animationDelay: "260ms" }}
        >
          from <span className="not-italic font-medium text-foreground">vertere</span>, Latin —
          to turn, to render, to translate.
        </p>
        <p
          className="blur-up mt-10 max-w-[34ch] text-[13.5px] text-muted-foreground"
          style={{ animationDelay: "420ms" }}
        >
          A workspace for translators, writers, and editors.
        </p>
        <div
          className="blur-up mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-5"
          style={{ animationDelay: "580ms" }}
        >
          <Link
            href="/app"
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-foreground bg-foreground px-5 text-[13px] font-medium tracking-tight text-background shadow-[2px_2px_0_var(--ink)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--ink)]"
          >
            Start writing
            <span aria-hidden className="font-mono text-[11px] opacity-60">↵</span>
          </Link>
          {authEnabled && (
            <a
              href="/api/auth/signin"
              className="text-[13px] italic text-muted-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-ink"
            >
              or sign in with Google to keep your history
            </a>
          )}
        </div>
      </div>

      <a
        href="#preview"
        aria-label="Scroll down"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-muted-foreground transition-colors hover:text-foreground"
      >
        ↓
      </a>
    </section>
  );
}
```

### Step 4.4: Preview component

- [ ] Create `src/components/landing/preview.tsx`:

```tsx
import Image from "next/image";

export function Preview() {
  return (
    <section id="preview" className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <div className="grid w-full max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[1fr_280px] lg:gap-16">
        <div className="overflow-hidden rounded-md border border-hairline shadow-[0_24px_60px_-30px_rgb(0_0_0/0.25)]">
          <Image
            src="/landing/preview.png"
            alt="Vertor app preview — translating a French paragraph into English"
            width={1440}
            height={900}
            className="block w-full dark:hidden"
            priority
          />
          <Image
            src="/landing/preview-dark.png"
            alt="Vertor app preview — translating a French paragraph into English"
            width={1440}
            height={900}
            className="hidden w-full dark:block"
            priority
          />
        </div>

        <aside className="flex flex-col justify-center gap-10 text-[14px] leading-snug">
          <p className="display italic">
            <span className="text-ink">—</span> Stream translations from any major model.
          </p>
          <p className="display italic">
            <span className="text-ink">—</span> Click any word for three alternatives. Refine without leaving the page.
          </p>
          <p className="display italic">
            <span className="text-ink">—</span> Export to Word, PDF, LaTeX, Markdown.
          </p>
        </aside>
      </div>
    </section>
  );
}
```

### Step 4.5: Closing component

- [ ] Create `src/components/landing/closing.tsx`:

```tsx
import Link from "next/link";

export function Closing({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <blockquote className="display max-w-[36ch] text-[28px] italic leading-[1.25] text-foreground/85 md:text-[34px]">
        “A translator is a writer who writes in another’s voice. The work is invisible — and yet, without it, nothing carries across.”
      </blockquote>
      <figcaption className="mt-6 text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
        Vertor
      </figcaption>

      <div className="mt-14 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
        <Link
          href="/app"
          className="inline-flex h-10 items-center gap-2 rounded-sm border border-foreground bg-foreground px-5 text-[13px] font-medium tracking-tight text-background shadow-[2px_2px_0_var(--ink)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--ink)]"
        >
          Start writing
          <span aria-hidden className="font-mono text-[11px] opacity-60">↵</span>
        </Link>
        {authEnabled && (
          <a
            href="/api/auth/signin"
            className="text-[13px] italic text-muted-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-ink"
          >
            or sign in with Google
          </a>
        )}
      </div>

      <footer className="mt-24 w-full max-w-3xl border-t border-hairline pt-4 text-center text-[10.5px] italic text-muted-foreground">
        Vertor · 2026 · Built on Vercel
      </footer>
    </section>
  );
}
```

### Step 4.6: Marketing layout

- [ ] Create `src/app/(marketing)/layout.tsx`:

```tsx
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative bg-background text-foreground">{children}</div>;
}
```

### Step 4.7: Marketing page

- [ ] Create `src/app/(marketing)/page.tsx`:

```tsx
import { auth, authEnabled } from "@/lib/auth";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { Hero } from "@/components/landing/hero";
import { Preview } from "@/components/landing/preview";
import { Closing } from "@/components/landing/closing";

export default async function LandingPage() {
  const session = authEnabled ? await auth() : null;
  const sessionInfo = {
    enabled: authEnabled,
    user: session?.user
      ? {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }
      : null,
  };

  return (
    <>
      <MarketingHeader session={sessionInfo} />
      <Hero authEnabled={authEnabled} />
      <Preview />
      <Closing authEnabled={authEnabled} />
    </>
  );
}
```

### Step 4.8: Generate the preview screenshots

- [ ] Ensure `pnpm dev` is running.
- [ ] Open http://localhost:3000/app in a browser at 1440×900.
- [ ] Paste this French sample into the source pane (so the preview shows real content, not the empty quote):
  > Le traducteur est un écrivain qui écrit dans la langue d'autrui. Il habite, le temps d'un livre, le souffle d'une voix qui n'est pas la sienne, et la rend audible.
- [ ] Click Translate (requires `AI_GATEWAY_API_KEY` set; if not, skip and use the empty state — it still looks editorial).
- [ ] In **light** mode: capture a full-page screenshot, save as `public/landing/preview.png`. Recommended dimensions: 1440×900 PNG.
- [ ] Toggle to **dark** mode, capture again, save as `public/landing/preview-dark.png`.

If you don't have a screenshot tool wired up, the simplest path:

```bash
# in another terminal, install playwright once
pnpm dlx playwright install chromium
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/app');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'public/landing/preview' + (scheme === 'dark' ? '-dark' : '') + '.png', fullPage: false });
    await ctx.close();
  }
  await browser.close();
})();
"
```

(Playwright is not added to deps — this is a one-time capture, run via `pnpm dlx`.)

### Step 4.9: Build verification

- [ ] Run:

```bash
pnpm exec next build 2>&1 | tail -20
```

Expected: routes show `/`, `/app`, `/sign-in`. Both `/` and `/app` listed as static or dynamic per their `auth()` usage.

### Step 4.10: Visual verification

- [ ] Visit http://localhost:3000/ — landing page loads with hero, preview, closing.
- [ ] Confirm the aurora animates softly behind the wordmark (a slow blue wash; the mask should make it fade out before the section ends, so it doesn't bleed into Section 2).
- [ ] Move the mouse across the hero — the aurora should drift very slightly with the cursor.
- [ ] Open the browser devtools console — no WebGL errors.
- [ ] Visit http://localhost:3000/app — translator app loads as before (no aurora; it's hero-only).
- [ ] Resize to 375×812 (mobile) — landing remains readable; the wordmark scales via `14vw`. Hero CTAs stack. The aurora still renders.

### Step 4.11: Commit

```bash
git add src/app/ src/components/landing/ public/landing/ package.json pnpm-lock.yaml && \
git -c commit.gpgsign=false commit -m "Add editorial landing page; move app to /app

New marketing route group at / with three full-height sections (hero,
app preview, closing). Hero uses a WebGL aurora (ogl) tuned to the ink
palette at low brightness so it sits behind the wordmark rather than
competing with it. Translator moves to /app. Preview screenshots
captured at 1440x900 in both color schemes."
```

---

## Task 5: Local → cloud migration

**Files:**
- Create: `src/app/api/documents/migrate/route.ts`
- Create: `src/app/api/documents/__tests__/migrate.test.ts`
- Create: `src/components/translator/migrate-banner.tsx`
- Modify: `src/components/translator/translator-app.tsx`

### Step 5.1: Migration endpoint

- [ ] Create `src/app/api/documents/migrate/route.ts`:

```ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { auth, authEnabled } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  docs: z
    .array(
      z.object({
        title: z.string().default("Untitled"),
        sourceText: z.string().default(""),
        translatedText: z.string().default(""),
        sourceLang: z.string().default("auto"),
        targetLang: z.string().default("en"),
        modelId: z.string().default("gemini-3.1-flash-lite-preview"),
        createdAt: z.number().optional(),
        updatedAt: z.number().optional(),
      }),
    )
    .min(1)
    .max(500),
});

export async function POST(req: NextRequest) {
  if (!authEnabled) return new Response("auth not configured", { status: 503 });
  const db = getDb();
  if (!db) return new Response("db not configured", { status: 503 });
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("unauthorized", { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const rows = parsed.data.docs.map((d) => ({
    userId,
    title: d.title,
    sourceText: d.sourceText,
    translatedText: d.translatedText,
    sourceLang: d.sourceLang,
    targetLang: d.targetLang,
    modelId: d.modelId,
    ...(d.createdAt ? { createdAt: new Date(d.createdAt) } : {}),
    ...(d.updatedAt ? { updatedAt: new Date(d.updatedAt) } : {}),
  }));

  const inserted = await db.insert(schema.documents).values(rows).returning();
  return Response.json({ inserted: inserted.length, documents: inserted });
}
```

### Step 5.2: Migration endpoint test (smoke-level)

The endpoint depends on Neon + Auth.js. Write a thin schema-only test that exercises the Zod parse path; full end-to-end is verified manually in Task 6.

- [ ] Create `src/app/api/documents/__tests__/migrate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { z } from "zod";

// Re-declare the Body schema used in the route. Keep in sync.
const Body = z.object({
  docs: z
    .array(
      z.object({
        title: z.string().default("Untitled"),
        sourceText: z.string().default(""),
        translatedText: z.string().default(""),
        sourceLang: z.string().default("auto"),
        targetLang: z.string().default("en"),
        modelId: z.string().default("gemini-3.1-flash-lite-preview"),
        createdAt: z.number().optional(),
        updatedAt: z.number().optional(),
      }),
    )
    .min(1)
    .max(500),
});

describe("migrate endpoint Body schema", () => {
  it("accepts a minimal doc list", () => {
    const out = Body.safeParse({ docs: [{}] });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.data.docs[0].title).toBe("Untitled");
      expect(out.data.docs[0].modelId).toBe("gemini-3.1-flash-lite-preview");
    }
  });

  it("rejects an empty docs array", () => {
    expect(Body.safeParse({ docs: [] }).success).toBe(false);
  });

  it("rejects more than 500 docs", () => {
    const docs = Array.from({ length: 501 }, () => ({}));
    expect(Body.safeParse({ docs }).success).toBe(false);
  });

  it("preserves explicit timestamps", () => {
    const out = Body.safeParse({ docs: [{ createdAt: 1000, updatedAt: 2000 }] });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.data.docs[0].createdAt).toBe(1000);
      expect(out.data.docs[0].updatedAt).toBe(2000);
    }
  });
});
```

- [ ] Run:

```bash
pnpm test
```

Expected: all tests pass (4 new + previous 10).

### Step 5.3: Migrate banner component

- [ ] Create `src/components/translator/migrate-banner.tsx`:

```tsx
"use client";
import * as React from "react";
import { X } from "lucide-react";
import type { LocalDoc } from "@/lib/doc-store";

type Props = {
  localDocs: LocalDoc[];
  userKey: string; // userId or email — for the dismiss flag
  onMigrate: () => Promise<void>;
  onDismiss: () => void;
};

export function MigrateBanner({ localDocs, userKey, onMigrate, onDismiss }: Props) {
  const dismissKey = `vertor.migrate.dismissed.${userKey}`;
  const [dismissed, setDismissed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  if (dismissed || localDocs.length === 0) return null;

  const dismiss = (persist: boolean) => {
    if (persist) localStorage.setItem(dismissKey, "1");
    setDismissed(true);
    onDismiss();
  };

  const migrate = async () => {
    setBusy(true);
    try {
      await onMigrate();
      dismiss(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-up mx-3 mt-3 rounded-sm border border-hairline bg-ink/[0.06] px-3 py-2.5 text-[12px]">
      <div className="font-medium leading-snug">
        You have {localDocs.length} local {localDocs.length === 1 ? "document" : "documents"}.
      </div>
      <p className="mt-0.5 italic text-muted-foreground">
        Move them to your account so they sync across devices?
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          onClick={migrate}
          disabled={busy}
          className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-foreground bg-foreground px-2.5 text-[11.5px] font-medium text-background shadow-[2px_2px_0_var(--ink)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--ink)] disabled:opacity-50"
        >
          {busy ? "Moving…" : "Move to cloud"}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dismiss(true)}
            className="text-[11px] italic text-muted-foreground underline decoration-hairline underline-offset-[6px] hover:text-foreground"
          >
            keep local
          </button>
          <button onClick={() => dismiss(true)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 5.4: Wire the banner into `translator-app.tsx`

- [ ] Add the banner import at the top of `src/components/translator/translator-app.tsx`:

```tsx
import { MigrateBanner } from "./migrate-banner";
import { LocalDocStore } from "@/lib/doc-store";
```

(`LocalDocStore` may already be imported — check the existing import line and merge.)

- [ ] Inside `TranslatorApp`, add this state + effect:

```tsx
  const [pendingLocalDocs, setPendingLocalDocs] = React.useState<LocalDoc[]>([]);

  React.useEffect(() => {
    if (!session.user) {
      setPendingLocalDocs([]);
      return;
    }
    // We're signed in. Check if there are local docs the user could move up.
    const local = new LocalDocStore();
    local.list().then(async (locals) => {
      if (locals.length === 0) return;
      const cloud = await store.list();
      // Show banner if user has local docs (regardless of cloud count — append model).
      void cloud;
      setPendingLocalDocs(locals);
    });
  }, [session.user, store]);

  const migrateLocalDocs = React.useCallback(async () => {
    const res = await fetch("/api/documents/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docs: pendingLocalDocs }),
    });
    if (!res.ok) throw new Error(await res.text());
    // Clear local storage once cloud insert succeeded.
    const local = new LocalDocStore();
    for (const d of pendingLocalDocs) await local.remove(d.id);
    setPendingLocalDocs([]);
    setDocs(await store.list());
  }, [pendingLocalDocs, store]);
```

- [ ] Render the banner at the top of the sidebar area. Locate the line that mounts the sidebar:

```tsx
      {sidebarOpen && (
        <HistorySidebar
          docs={docs}
          currentId={doc.id}
          onSelect={openDocument}
          onNew={newDocument}
          onDelete={removeDocument}
        />
      )}
```

Replace with:

```tsx
      {sidebarOpen && (
        <div className="flex w-[252px] shrink-0 flex-col border-r border-hairline bg-muted/40">
          {session.user && pendingLocalDocs.length > 0 && (
            <MigrateBanner
              localDocs={pendingLocalDocs}
              userKey={session.user.email ?? "user"}
              onMigrate={migrateLocalDocs}
              onDismiss={() => setPendingLocalDocs([])}
            />
          )}
          <HistorySidebar
            docs={docs}
            currentId={doc.id}
            onSelect={openDocument}
            onNew={newDocument}
            onDelete={removeDocument}
            hideOuterShell
          />
        </div>
      )}
```

- [ ] In `src/components/translator/sidebar.tsx`, add the `hideOuterShell` prop and skip the outer `<aside>` shell when set, so the wrapper above provides the chrome. At the top of the component:

Change:

```tsx
export function HistorySidebar({
  docs,
  currentId,
  onSelect,
  onNew,
  onDelete,
}: {
```

To:

```tsx
export function HistorySidebar({
  docs,
  currentId,
  onSelect,
  onNew,
  onDelete,
  hideOuterShell = false,
}: {
  hideOuterShell?: boolean;
```

(Add `hideOuterShell?: boolean;` inside the existing prop type list.)

And change the return root from:

```tsx
    <aside className="flex h-full w-[252px] shrink-0 flex-col border-r border-hairline bg-muted/40">
```

To:

```tsx
    <aside className={cn("flex h-full flex-1 flex-col", !hideOuterShell && "w-[252px] shrink-0 border-r border-hairline bg-muted/40")}>
```

### Step 5.5: Build verification

- [ ] Run:

```bash
pnpm exec next build 2>&1 | tail -15
```

Expected: success.

### Step 5.6: Visual verification (banner only — full sign-in tested in Task 6)

- [ ] In dev, set fake docs into localStorage and inspect the banner UI manually. From the browser console at `/app`:

```js
localStorage.setItem('vertor.docs.v1', JSON.stringify([
  { id: 'a', title: 'Test 1', sourceText: 'hello', translatedText: '', sourceLang: 'auto', targetLang: 'en', modelId: 'gemini-3.1-flash-lite-preview', createdAt: Date.now(), updatedAt: Date.now() },
]));
```

Then trigger a re-render (refresh). Banner shows only when signed in — for now in local mode it stays hidden. The visual will be validated end-to-end in Task 6 once auth is wired.

### Step 5.7: Commit

```bash
git add src/app/api/documents/migrate/ src/components/translator/migrate-banner.tsx src/components/translator/translator-app.tsx src/components/translator/sidebar.tsx src/app/api/documents/__tests__/ && \
git -c commit.gpgsign=false commit -m "Add local-to-cloud migration on first sign-in

POST /api/documents/migrate inserts a batch of local docs under the
current user. Translator app shows a one-time banner offering migration
when the user signs in with local docs present. Dismissal is per-account."
```

---

## Task 6: Setup runbook — make it real

This task is operational. No code changes; verify the runbook in the spec works end-to-end.

### Step 6.1: Confirm `.env.example` is current

- [ ] Open `.env.example` and verify these vars are listed and described:

```
AI_GATEWAY_API_KEY
DATABASE_URL
AUTH_SECRET
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
NEXTAUTH_URL
```

If any are missing, add them with one-line comments. (Currently they should all be present.)

### Step 6.2: Vercel link

- [ ] Make sure the latest CLI is installed:

```bash
pnpm add -g vercel@latest
```

- [ ] In the repo root:

```bash
vercel link
```

When prompted: link to existing project named `vertor` (create if needed).

### Step 6.3: Provision Neon

- [ ] Open the Vercel dashboard for the `vertor` project → Storage → Marketplace → Neon Postgres → Connect → pick the project.
- [ ] Pull env vars locally:

```bash
vercel env pull .env.local
```

- [ ] Verify `.env.local` now contains `DATABASE_URL`.

### Step 6.4: Push the schema

- [ ] Run:

```bash
pnpm drizzle-kit push
```

Expected: prompts to apply migrations; type `Yes`. Tables `user`, `account`, `session`, `verificationToken`, `document` are created in Neon. Verify in the Neon console SQL editor:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

### Step 6.5: Google OAuth credentials

- [ ] In Google Cloud Console, create an OAuth 2.0 Client (Web).
- [ ] Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://vertor.vercel.app/api/auth/callback/google`
- [ ] Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

- [ ] In Vercel dashboard → Settings → Environment Variables, add (Production scope):
  - `AUTH_GOOGLE_ID` = client id
  - `AUTH_GOOGLE_SECRET` = client secret
  - `AUTH_SECRET` = the random string above
  - `NEXTAUTH_URL` = `https://vertor.vercel.app`
- [ ] Pull the new vars locally:

```bash
vercel env pull .env.local
```

### Step 6.6: Local sign-in smoke test

- [ ] Restart the dev server so the new env vars are picked up:

```bash
pnpm dev
```

- [ ] In a browser, visit http://localhost:3000/. Confirm:
  - Landing page renders
  - "Sign in" link in header (because `authEnabled` is now true)
- [ ] Click "Sign in" → Google flow → returns to `/app` with the user menu populated (initials in a circle).
- [ ] Create a new doc, type some text. Verify in the Neon SQL editor:

```sql
SELECT id, title, "userId", "updatedAt" FROM document ORDER BY "updatedAt" DESC LIMIT 5;
```

The doc should appear there.

### Step 6.7: Local→cloud migration smoke test

- [ ] Sign out (`/api/auth/signout`).
- [ ] At `/app`, create 2 local docs.
- [ ] Sign in again. Verify the migration banner appears at the top of the sidebar with "You have 2 local documents."
- [ ] Click "Move to cloud." Verify both docs appear in the sidebar (now cloud-backed) and in Neon's `document` table.

### Step 6.8: Deploy to production

- [ ] Run:

```bash
vercel deploy --prod
```

- [ ] Visit https://vertor.vercel.app/. Confirm the landing page loads.
- [ ] Sign in via Google. Confirm round-trip works.

### Step 6.9: Commit any small fixes that surfaced

If any code changed during Task 6 (typo in env example, missed callback URL handling, etc.), commit with:

```bash
git add . && \
git -c commit.gpgsign=false commit -m "Fix issues found during deploy smoke test"
```

If nothing changed, no commit is needed.

---

## Self-review checklist

After all tasks land:

- [ ] `grep -rn "vermilion" src/` returns zero matches.
- [ ] `pnpm exec next build` exits 0.
- [ ] `pnpm test` passes.
- [ ] `/` shows the landing page; `/app` shows the translator.
- [ ] Mode toggle is a visible segmented control with tooltips on both options.
- [ ] In production: signing in with Google persists docs to Neon; signing out and back in restores them; the migrate banner moves any local docs.
