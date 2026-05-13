// Alignment utilities and a session-scoped cache. Pure functions only — no
// React, no fetch — so they can be unit-tested and shared by the API route
// and the client without dragging the DOM in.

export type ParagraphSpan = {
  index: number;
  start: number;
  end: number;
  text: string;
};

// Split text into paragraphs preserving original character offsets. A
// paragraph is a run of non-empty text separated by one-or-more blank lines
// (the translation prompt guarantees these line up 1:1 across source and
// translation). Trailing whitespace inside a paragraph is kept so [start, end]
// match the original string verbatim.
export function splitParagraphs(text: string): ParagraphSpan[] {
  const out: ParagraphSpan[] = [];
  const re = /\n\s*\n/g;
  let cursor = 0;
  let idx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const slice = text.slice(cursor, m.index);
    if (slice.trim()) {
      out.push({ index: idx++, start: cursor, end: m.index, text: slice });
    }
    cursor = m.index + m[0].length;
  }
  if (cursor < text.length) {
    const slice = text.slice(cursor);
    if (slice.trim()) {
      out.push({ index: idx++, start: cursor, end: text.length, text: slice });
    }
  }
  return out;
}

// Find the index of the paragraph that contains `offset`. Returns -1 if the
// offset lands in an inter-paragraph gap or outside the text.
export function findParagraphIndex(
  offset: number,
  paragraphs: ParagraphSpan[],
): number {
  for (const p of paragraphs) {
    if (offset >= p.start && offset <= p.end) return p.index;
  }
  return -1;
}

// Cheap stable fingerprint for cache keys. We don't need cryptographic
// strength — we just need any edit to bust the cache. Length + sampled
// characters at boundaries gives that.
export function fingerprint(text: string): string {
  if (!text) return "0";
  const head = text.slice(0, 16);
  const tail = text.slice(-16);
  return `${text.length}:${head}:${tail}`;
}

export type AlignDirection = "source-to-translation" | "translation-to-source";

export type AlignmentResult = { start: number; end: number };

export function alignCacheKey(opts: {
  direction: AlignDirection;
  selection: string;
  selectionStart: number;
  source: string;
  translation: string;
}): string {
  return [
    opts.direction,
    opts.selectionStart,
    opts.selection,
    fingerprint(opts.source),
    fingerprint(opts.translation),
  ].join("|");
}

const cache = new Map<string, AlignmentResult | null>();

export function getCachedAlignment(
  key: string,
): AlignmentResult | null | undefined {
  return cache.get(key);
}

export function setCachedAlignment(
  key: string,
  value: AlignmentResult | null,
): void {
  // Keep memory bounded — evict the oldest entry only when we're inserting a
  // NEW key past the ceiling. Updates to existing keys never grow the map and
  // shouldn't evict anything.
  if (!cache.has(key) && cache.size >= 500) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

// Locate `needle` in `haystack`, preferring matches inside the paragraph at
// `preferredParagraph` (if provided). Returns null when not found.
export function locateMatch(opts: {
  haystack: string;
  needle: string;
  preferredParagraph?: ParagraphSpan | null;
}): AlignmentResult | null {
  const { haystack, needle, preferredParagraph } = opts;
  if (!needle) return null;
  if (preferredParagraph) {
    const idx = preferredParagraph.text.indexOf(needle);
    if (idx !== -1) {
      const start = preferredParagraph.start + idx;
      return { start, end: start + needle.length };
    }
  }
  const idx = haystack.indexOf(needle);
  if (idx === -1) return null;
  return { start: idx, end: idx + needle.length };
}
