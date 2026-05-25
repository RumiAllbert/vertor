import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { resolveModel } from "@/lib/model-client";
import { alignmentSystem } from "@/lib/prompts";
import {
  splitParagraphs,
  findParagraphIndex,
  locateMatch,
} from "@/lib/alignment";
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

// Fixed model — alignment is a small, structured task where the cheapest
// option is plenty. Hardcoding keeps cost predictable regardless of which
// model the document is using for translation.
const ALIGN_MODEL_ID = "gemini-3.1-flash-lite-preview";

const Body = z.object({
  source: z.string().min(1),
  translation: z.string().min(1),
  selection: z.string().min(1),
  selectionStart: z.number().int().nonnegative(),
  selectionEnd: z.number().int().positive(),
  direction: z.enum(["source-to-translation", "translation-to-source"]),
  sourceLang: z.string().default("auto"),
  targetLang: z.string().min(2),
});

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
    });
  }
  const parsed = Body.safeParse(payload);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.message }), {
      status: 400,
    });
  }
  const {
    source,
    translation,
    selection,
    selectionStart,
    selectionEnd,
    direction,
    sourceLang,
    targetLang,
  } = parsed.data;

  const fromText = direction === "source-to-translation" ? source : translation;
  const toText = direction === "source-to-translation" ? translation : source;

  // Sanity-check the offsets against the actual origin text. The client
  // sometimes races against doc edits, and bogus offsets would give the LLM a
  // garbled prompt.
  if (
    selectionEnd <= selectionStart ||
    selectionEnd > fromText.length ||
    fromText.slice(selectionStart, selectionEnd) !== selection
  ) {
    return new Response(
      JSON.stringify({ error: "Selection offsets do not match origin text" }),
      { status: 400 },
    );
  }

  // Compute paragraph context for both sides so we can hint the model at the
  // right neighborhood AND constrain the post-match search to the matching
  // paragraph first (handles repeated words correctly).
  const fromParas = splitParagraphs(fromText);
  const toParas = splitParagraphs(toText);
  const fromParaIdx = findParagraphIndex(selectionStart, fromParas);
  const toParagraph = fromParaIdx >= 0 ? toParas[fromParaIdx] ?? null : null;

  const userPrompt = [
    `### Selection (from the source side)`,
    selection,
    "",
    `### Source-side paragraph containing the selection`,
    fromParaIdx >= 0 ? fromParas[fromParaIdx].text : "(unknown)",
    "",
    `### Target-side text (full)`,
    toText,
  ].join("\n");

  const quota = await consumeRateLimit(req, ALIGN_MODEL_ID);
  if (!quota.allowed) return rateLimitResponse(quota);

  let match: string | null = null;
  try {
    const { object } = await generateObject({
      model: resolveModel(ALIGN_MODEL_ID),
      system: alignmentSystem({ sourceLang, targetLang, direction }),
      prompt: userPrompt,
      temperature: 0,
      schema: z.object({ match: z.string().nullable() }),
    });
    match = object.match;
  } catch (err) {
    console.error("alignment generateObject failed", err);
    return Response.json({ start: null });
  }

  if (!match) return Response.json({ start: null });

  const located = locateMatch({
    haystack: toText,
    needle: match,
    preferredParagraph: toParagraph,
  });
  if (!located) return Response.json({ start: null });

  return Response.json(located);
}
