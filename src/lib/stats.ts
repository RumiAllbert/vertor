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

export type UserStats = {
  totalDocs: number;
  totalWords: number;
  languagesReached: number;
  avgWordsPerDoc: number;
  memberSince: Date | null;
  topLanguages: { code: string; name: string; count: number; pct: number }[];
  topPair: { source: string; target: string; sourceName: string; targetName: string; count: number } | null;
  activityLast30: { day: string; count: number }[];
  mostActiveWeekday: number | null;
  modelsUsed: { id: string; name: string; count: number; pct: number }[];
  longest: { id: string; title: string; words: number } | null;
  recent: { id: string; title: string; sourceLang: string; targetLang: string; updatedAt: Date }[];
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

export function computeStats(docs: StatDoc[], memberSince: Date | null, now = new Date()): UserStats {
  if (docs.length === 0) {
    return {
      totalDocs: 0,
      totalWords: 0,
      languagesReached: 0,
      avgWordsPerDoc: 0,
      memberSince,
      topLanguages: [],
      topPair: null,
      activityLast30: buildEmptyWindow(now, 30),
      mostActiveWeekday: null,
      modelsUsed: [],
      longest: null,
      recent: [],
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

  const window = buildEmptyWindow(now, 30);
  const windowIndex = new Map(window.map((row, i) => [row.day, i]));
  for (const d of docs) {
    const day = isoDay(d.createdAt);
    const i = windowIndex.get(day);
    if (i !== undefined) window[i].count += 1;
  }

  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of docs) weekdayCounts[d.createdAt.getUTCDay()] += 1;
  let mostActiveWeekday: number | null = null;
  let mostActiveWeekdayCount = 0;
  for (let i = 0; i < 7; i++) {
    if (weekdayCounts[i] > mostActiveWeekdayCount) {
      mostActiveWeekdayCount = weekdayCounts[i];
      mostActiveWeekday = i;
    }
  }

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
    memberSince,
    topLanguages,
    topPair,
    activityLast30: window,
    mostActiveWeekday,
    modelsUsed,
    longest,
    recent,
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
