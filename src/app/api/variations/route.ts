import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import { resolveModel } from "@/lib/model-client";
import { variationsSystem, type VariationKind } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  selection: z.string().min(1),
  sourceContext: z.string().default(""),
  translationContext: z.string().default(""),
  sourceLang: z.string().default("auto"),
  targetLang: z.string().min(2),
  modelId: z.string().default(DEFAULT_MODEL_ID),
  kind: z.enum(["word", "phrase", "paragraph", "document"]),
  instruction: z.string().optional(),
  // If set, the model produces 3 NEW variations in the spirit of basedOn.
  basedOn: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.message }), { status: 400 });
  }
  const { selection, sourceContext, translationContext, sourceLang, targetLang, modelId, kind, instruction, basedOn } =
    parsed.data;

  const userPrompt = [
    `### Selected ${kind}`,
    selection,
    "",
    `### Surrounding source context`,
    sourceContext || "(none)",
    "",
    `### Surrounding translation context`,
    translationContext || "(none)",
  ].join("\n");

  const { object } = await generateObject({
    model: resolveModel(modelId),
    system: variationsSystem({ kind: kind as VariationKind, sourceLang, targetLang, instruction, basedOn }),
    prompt: userPrompt,
    temperature: 0.8,
    schema: z.object({
      variations: z.array(z.string().min(1)).length(3),
    }),
  });

  return Response.json(object);
}
