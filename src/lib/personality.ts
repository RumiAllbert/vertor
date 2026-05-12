import { generateObject } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { resolveModel } from "@/lib/model-client";
import { personalitySystem } from "@/lib/prompts";
import { getDb, schema } from "@/lib/db";
import type { PersonalityValue } from "@/lib/db/schema";
import type { StatDoc, UserStats } from "@/lib/stats";
import { languageName } from "@/lib/languages";
import { getModel } from "@/lib/models";

const PERSONALITY_MODEL_ID = "gemini-3.1-flash-lite-preview";
const UNLOCK_THRESHOLD = 5;
const REFRESH_INTERVAL = 5;
const MIN_REGEN_GAP_MS = 10_000;

const PersonalitySchema = z.object({
  title: z.string().min(2).max(40),
  blurb: z.string().min(8).max(180),
  traits: z.tuple([z.string().min(1).max(14), z.string().min(1).max(14), z.string().min(1).max(14)]),
});

export function shouldGenerate(args: {
  totalDocs: number;
  storedDocCount: number;
  existing: PersonalityValue | null;
}): boolean {
  if (args.totalDocs < UNLOCK_THRESHOLD) return false;
  if (args.existing && args.totalDocs < args.storedDocCount + REFRESH_INTERVAL) return false;
  if (args.existing) {
    const generatedAt = Date.parse(args.existing.generatedAt);
    if (!Number.isNaN(generatedAt) && Date.now() - generatedAt < MIN_REGEN_GAP_MS) {
      return false;
    }
  }
  return true;
}

export function buildPersonalityPrompt(docs: StatDoc[], stats: UserStats): string {
  const recentTitles = [...docs]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 30)
    .map((d) => `- "${(d.title || "Untitled").slice(0, 80)}" (${langPair(d.sourceLang, d.targetLang)})`);

  const dominantTargets = stats.topLanguages.slice(0, 3).map((l) => `${l.name} (${l.count})`).join(", ") || "—";
  const dominantModel = stats.modelsUsed[0]?.name ?? getModel(PERSONALITY_MODEL_ID).label;

  return [
    `Total translations: ${stats.totalDocs}`,
    `Most-used target languages: ${dominantTargets}`,
    `Top pair: ${stats.topPair ? `${stats.topPair.sourceName} → ${stats.topPair.targetName} (${stats.topPair.count})` : "—"}`,
    `Preferred model: ${dominantModel}`,
    `Words translated (source): ${stats.totalWords}`,
    ``,
    `Recent document titles:`,
    ...recentTitles,
  ].join("\n");
}

function langPair(source: string, target: string): string {
  const s = source === "auto" ? "auto" : languageName(source);
  const t = languageName(target);
  return `${s} → ${t}`;
}

export async function maybeGeneratePersonality(args: {
  userId: string;
  totalDocs: number;
  storedDocCount: number;
  existing: PersonalityValue | null;
  docs: StatDoc[];
  stats: UserStats;
}): Promise<PersonalityValue | null> {
  if (!shouldGenerate({ totalDocs: args.totalDocs, storedDocCount: args.storedDocCount, existing: args.existing })) {
    return args.existing;
  }
  const db = getDb();
  if (!db) return args.existing;

  try {
    const { object } = await generateObject({
      model: resolveModel(PERSONALITY_MODEL_ID),
      system: personalitySystem(),
      prompt: buildPersonalityPrompt(args.docs, args.stats),
      schema: PersonalitySchema,
      temperature: 0.9,
    });

    const next: PersonalityValue = {
      title: object.title,
      blurb: object.blurb,
      traits: object.traits as [string, string, string],
      generatedAt: new Date().toISOString(),
    };

    await db
      .update(schema.users)
      .set({ personality: next, personalityDocCount: args.totalDocs })
      .where(eq(schema.users.id, args.userId));

    return next;
  } catch (err) {
    console.error("personality generation failed", err);
    return args.existing;
  }
}

export const PERSONALITY_UNLOCK_THRESHOLD = UNLOCK_THRESHOLD;
export const PERSONALITY_REFRESH_INTERVAL = REFRESH_INTERVAL;
