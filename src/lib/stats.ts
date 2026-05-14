import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { languageName, LANGUAGES } from "@/lib/languages";
import { getModel } from "@/lib/models";

export type StatDoc = {
  id: string;
  title: string;
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  modelId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Milestone = {
  id: string;
  label: string;
  // One-line hint describing what unlocks it. Shown on hover / for unearned.
  hint: string;
  earned: boolean;
};

export type UserStats = {
  totalDocs: number;
  totalWords: number;
  languagesReached: number;
  avgWordsPerDoc: number;
  currentStreak: number;
  longestStreak: number;
  memberSince: Date | null;
  topLanguages: { code: string; name: string; count: number; pct: number }[];
  topPair: { source: string; target: string; sourceName: string; targetName: string; count: number } | null;
  activityLast30: { day: string; count: number }[];
  activityYear: { day: string; count: number }[];
  // Length-24 array — count of translations created in each hour-of-day.
  hourRhythm: number[];
  // Hour (0-23) with the most translations, or null when there's no data.
  peakHour: number | null;
  mostActiveWeekday: number | null;
  modelsUsed: { id: string; name: string; count: number; pct: number }[];
  longest: { id: string; title: string; words: number } | null;
  recent: { id: string; title: string; sourceLang: string; targetLang: string; updatedAt: Date }[];
  milestones: Milestone[];
};

export function wordCount(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Compute current streak (consecutive days ending today/yesterday with ≥1 doc)
// and the longest streak ever. A streak survives a single empty "today" — if
// the user hasn't translated today yet but did yesterday, the streak counts.
function computeStreaks(
  daysWithActivity: Set<string>,
  now: Date,
): { current: number; longest: number } {
  if (daysWithActivity.size === 0) return { current: 0, longest: 0 };

  // Sort the ISO day strings — lexicographic order matches chronological for
  // YYYY-MM-DD.
  const days = Array.from(daysWithActivity).sort();
  // Longest run anywhere in history
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + "T00:00:00Z");
    const curr = new Date(days[i] + "T00:00:00Z");
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) run += 1;
    else run = 1;
    if (run > longest) longest = run;
  }

  // Current streak — walk backwards from today (or yesterday if today empty).
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  let cursor = today;
  if (!daysWithActivity.has(isoDay(cursor))) {
    cursor = new Date(cursor.getTime() - 86_400_000);
    if (!daysWithActivity.has(isoDay(cursor))) return { current: 0, longest };
  }
  let current = 0;
  while (daysWithActivity.has(isoDay(cursor))) {
    current += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return { current, longest };
}

function computeMilestones(args: {
  totalDocs: number;
  totalWords: number;
  languagesReached: number;
  longestStreak: number;
  longestDocWords: number;
  nightOwlDocs: number;
  weekendDocs: number;
  weekendPair: boolean;
}): Milestone[] {
  const M: Milestone[] = [
    {
      id: "first-voyage",
      label: "First voyage",
      hint: "Your first translation.",
      earned: args.totalDocs >= 1,
    },
    {
      id: "polyglot",
      label: "Polyglot",
      hint: "Translate into five different languages.",
      earned: args.languagesReached >= 5,
    },
    {
      id: "marathon",
      label: "Marathon",
      hint: "Translate ten thousand words.",
      earned: args.totalWords >= 10_000,
    },
    {
      id: "week-streak",
      label: "Seven-day streak",
      hint: "Translate on seven consecutive days.",
      earned: args.longestStreak >= 7,
    },
    {
      id: "hot-streak",
      label: "Hot streak",
      hint: "Translate on three consecutive days.",
      earned: args.longestStreak >= 3,
    },
    {
      id: "night-owl",
      label: "Night owl",
      hint: "Five translations begun between 10pm and 5am.",
      earned: args.nightOwlDocs >= 5,
    },
    {
      id: "sunday-translator",
      label: "Weekend translator",
      hint: "Five translations on a Saturday or Sunday.",
      earned: args.weekendDocs >= 5,
    },
    {
      id: "weekend-edition",
      label: "Weekend edition",
      hint: "Translate on both Saturday and Sunday in the same weekend.",
      earned: args.weekendPair,
    },
    {
      id: "line-editor",
      label: "Line editor",
      hint: "Translate a document over two thousand words.",
      earned: args.longestDocWords >= 2_000,
    },
    {
      id: "archivist",
      label: "The archivist",
      hint: "Save fifty translations.",
      earned: args.totalDocs >= 50,
    },
    {
      id: "long-haul",
      label: "Long haul",
      hint: "Translate twenty-five thousand words.",
      earned: args.totalWords >= 25_000,
    },
    {
      id: "centennial",
      label: "Centennial",
      hint: "One hundred translations.",
      earned: args.totalDocs >= 100,
    },
  ];
  return M;
}

export function computeStats(docs: StatDoc[], memberSince: Date | null, now = new Date()): UserStats {
  if (docs.length === 0) {
    return {
      totalDocs: 0,
      totalWords: 0,
      languagesReached: 0,
      avgWordsPerDoc: 0,
      currentStreak: 0,
      longestStreak: 0,
      memberSince,
      topLanguages: [],
      topPair: null,
      activityLast30: buildEmptyWindow(now, 30),
      activityYear: buildEmptyWindow(now, 365),
      hourRhythm: new Array(24).fill(0),
      peakHour: null,
      mostActiveWeekday: null,
      modelsUsed: [],
      longest: null,
      recent: [],
      milestones: computeMilestones({
        totalDocs: 0,
        totalWords: 0,
        languagesReached: 0,
        longestStreak: 0,
        longestDocWords: 0,
        nightOwlDocs: 0,
        weekendDocs: 0,
        weekendPair: false,
      }),
    };
  }

  const wordsPerDoc = docs.map((d) => wordCount(d.sourceText));
  const totalWords = wordsPerDoc.reduce((a, b) => a + b, 0);

  const targetCounts = new Map<string, number>();
  for (const d of docs) {
    if (d.targetLang && d.targetLang !== "auto") {
      targetCounts.set(d.targetLang, (targetCounts.get(d.targetLang) ?? 0) + 1);
    }
  }
  const topLanguages = Array.from(targetCounts.entries())
    .map(([code, count]) => ({
      code,
      name: languageName(code),
      count,
      pct: (count / docs.length) * 100,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6);

  const pairCounts = new Map<string, number>();
  for (const d of docs) {
    const key = `${d.sourceLang}__${d.targetLang}`;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  let topPair: UserStats["topPair"] = null;
  let topPairCount = 0;
  for (const [key, count] of pairCounts) {
    if (count > topPairCount) {
      topPairCount = count;
      const [source, target] = key.split("__");
      topPair = {
        source,
        target,
        sourceName: source === "auto" ? "Auto" : languageName(source),
        targetName: languageName(target),
        count,
      };
    }
  }

  // 30-day and 365-day windows share their bucket-fill loop.
  const window30 = buildEmptyWindow(now, 30);
  const window30Index = new Map(window30.map((row, i) => [row.day, i]));
  const window365 = buildEmptyWindow(now, 365);
  const window365Index = new Map(window365.map((row, i) => [row.day, i]));

  const daysWithActivity = new Set<string>();
  const hourRhythm = new Array(24).fill(0);
  let nightOwlDocs = 0;
  let weekendDocs = 0;
  const saturdayActivity = new Set<string>();
  const sundayActivity = new Set<string>();

  for (const d of docs) {
    const day = isoDay(d.createdAt);
    daysWithActivity.add(day);
    const i30 = window30Index.get(day);
    if (i30 !== undefined) window30[i30].count += 1;
    const i365 = window365Index.get(day);
    if (i365 !== undefined) window365[i365].count += 1;
    const hour = d.createdAt.getHours();
    hourRhythm[hour] += 1;
    // Night owl: 22:00 — 04:59 inclusive.
    if (hour >= 22 || hour < 5) nightOwlDocs += 1;
    const weekday = d.createdAt.getDay();
    if (weekday === 0 || weekday === 6) {
      weekendDocs += 1;
      if (weekday === 6) saturdayActivity.add(day);
      else sundayActivity.add(day);
    }
  }

  const weekendPair = Array.from(saturdayActivity).some((saturday) => {
    const sunday = new Date(saturday + "T00:00:00Z");
    sunday.setUTCDate(sunday.getUTCDate() + 1);
    return sundayActivity.has(isoDay(sunday));
  });

  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of docs) weekdayCounts[d.createdAt.getDay()] += 1;
  let mostActiveWeekday: number | null = null;
  let mostActiveWeekdayCount = 0;
  for (let i = 0; i < 7; i++) {
    if (weekdayCounts[i] > mostActiveWeekdayCount) {
      mostActiveWeekdayCount = weekdayCounts[i];
      mostActiveWeekday = i;
    }
  }

  let peakHour: number | null = null;
  let peakHourCount = 0;
  for (let h = 0; h < 24; h++) {
    if (hourRhythm[h] > peakHourCount) {
      peakHourCount = hourRhythm[h];
      peakHour = h;
    }
  }

  const { current: currentStreak, longest: longestStreak } = computeStreaks(
    daysWithActivity,
    now,
  );

  const modelCounts = new Map<string, number>();
  for (const d of docs) modelCounts.set(d.modelId, (modelCounts.get(d.modelId) ?? 0) + 1);
  const modelsUsed = Array.from(modelCounts.entries())
    .map(([id, count]) => ({ id, name: getModel(id).label, count, pct: (count / docs.length) * 100 }))
    .sort((a, b) => b.count - a.count);

  let longest: UserStats["longest"] = null;
  for (let i = 0; i < docs.length; i++) {
    const w = wordsPerDoc[i];
    if (w > 0 && (!longest || w > longest.words)) {
      longest = { id: docs[i].id, title: docs[i].title || "Untitled", words: w };
    }
  }

  const recent = [...docs]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      title: d.title || "Untitled",
      sourceLang: d.sourceLang,
      targetLang: d.targetLang,
      updatedAt: d.updatedAt,
    }));

  return {
    totalDocs: docs.length,
    totalWords,
    languagesReached: targetCounts.size,
    avgWordsPerDoc: Math.round(totalWords / docs.length),
    currentStreak,
    longestStreak,
    memberSince,
    topLanguages,
    topPair,
    activityLast30: window30,
    activityYear: window365,
    hourRhythm,
    peakHour,
    mostActiveWeekday,
    modelsUsed,
    longest,
    recent,
    milestones: computeMilestones({
      totalDocs: docs.length,
      totalWords,
      languagesReached: targetCounts.size,
      longestStreak,
      longestDocWords: longest?.words ?? 0,
      nightOwlDocs,
      weekendDocs,
      weekendPair,
    }),
  };
}

function buildEmptyWindow(now: Date, days: number): { day: string; count: number }[] {
  const result: { day: string; count: number }[] = [];
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() - i);
    result.push({ day: isoDay(d), count: 0 });
  }
  return result;
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const db = getDb();
  if (!db) return null;

  const [userRow] = await db
    .select({ createdAt: schema.users.createdAt })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  const rows = await db
    .select({
      id: schema.documents.id,
      title: schema.documents.title,
      sourceText: schema.documents.sourceText,
      sourceLang: schema.documents.sourceLang,
      targetLang: schema.documents.targetLang,
      modelId: schema.documents.modelId,
      createdAt: schema.documents.createdAt,
      updatedAt: schema.documents.updatedAt,
    })
    .from(schema.documents)
    .where(eq(schema.documents.userId, userId));

  return computeStats(rows as StatDoc[], userRow?.createdAt ?? null);
}

export const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code));

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

// "≈ a short novella" — flattering, screenshot-worthy equivalence for the
// total word count. Buckets tuned to feel earned at each threshold.
export function wordEquivalent(words: number): string | null {
  if (words < 100) return null;
  if (words < 500) return "≈ a long letter";
  if (words < 1_500) return "≈ a short story";
  if (words < 4_000) return "≈ a magazine feature";
  if (words < 8_000) return "≈ a New Yorker piece";
  if (words < 20_000) return "≈ a novella";
  if (words < 50_000) return "≈ a slim novel";
  if (words < 120_000) return "≈ a novel";
  const novels = Math.floor(words / 80_000);
  return `≈ ${novels} novels`;
}

// "Late evening" / "the small hours" / "mid-morning" — editorial label for a
// 24-hour clock position. Used in the rhythm card.
export function hourLabel(hour: number): string {
  if (hour < 5) return "the small hours";
  if (hour < 8) return "early morning";
  if (hour < 11) return "mid-morning";
  if (hour < 13) return "midday";
  if (hour < 16) return "early afternoon";
  if (hour < 18) return "late afternoon";
  if (hour < 21) return "evening";
  if (hour < 23) return "late evening";
  return "the witching hour";
}
