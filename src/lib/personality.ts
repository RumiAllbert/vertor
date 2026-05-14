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
const FALLBACK_MODEL_ID = "gemini-3.1-flash-preview";
const UNLOCK_THRESHOLD = 5;
const REFRESH_INTERVAL = 5;
const MIN_REGEN_GAP_MS = 10_000;

// Loose schema — the model occasionally returns 2 or 4 traits, or slightly
// over-length strings. Validating those out hard caused silent generation
// failures (and the card stayed in its "unlocks at 5" state forever). We
// accept what we get, then normalize to exactly three short adjectives below.
const PersonalitySchema = z.object({
  title: z.string().min(2).max(80),
  blurb: z.string().min(8).max(300),
  traits: z.array(z.string().min(1).max(40)).min(1).max(8),
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

// Coerce whatever the model returns into exactly three short, lowercase
// single-word adjectives. Splits on whitespace/punctuation, dedupes, pads.
function normalizeTraits(raw: string[]): [string, string, string] {
  const FALLBACKS = ["curious", "patient", "precise"];
  const words = raw
    .flatMap((t) => t.split(/[\s,;/·]+/))
    .map((w) => w.toLowerCase().replace(/[^\p{L}-]+/gu, "").slice(0, 14))
    .filter((w) => w.length >= 2);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length === 3) break;
  }
  for (const w of FALLBACKS) {
    if (out.length === 3) break;
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return [out[0], out[1], out[2]] as [string, string, string];
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

  const promptText = buildPersonalityPrompt(args.docs, args.stats);
  const attempt = (modelId: string) =>
    generateObject({
      model: resolveModel(modelId),
      system: personalitySystem(),
      prompt: promptText,
      schema: PersonalitySchema,
      temperature: 0.9,
    });
  try {
    let object: z.infer<typeof PersonalitySchema>;
    try {
      ({ object } = await attempt(PERSONALITY_MODEL_ID));
    } catch (firstErr) {
      // Many silent failures here are transient (429, schema-parse error,
      // gateway flake). Try the slightly larger flash model once before
      // giving up — it follows JSON instructions more reliably.
      console.error("personality: primary model failed, retrying", firstErr);
      ({ object } = await attempt(FALLBACK_MODEL_ID));
    }

    const normalized = normalizeTraits(object.traits);
    const next: PersonalityValue = {
      title: object.title.trim().slice(0, 60),
      blurb: object.blurb.trim().slice(0, 240),
      traits: normalized,
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
