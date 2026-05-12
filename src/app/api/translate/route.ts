import { NextRequest } from "next/server";
import { streamText } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import { resolveModel } from "@/lib/model-client";
import { translationSystem } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  text: z.string().min(1),
  sourceLang: z.string().default("auto"),
  targetLang: z.string().min(2),
  modelId: z.string().default(DEFAULT_MODEL_ID),
  instruction: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.message }), { status: 400 });
  }
  const { text, targetLang, modelId, instruction } = parsed.data;

  const result = streamText({
    model: resolveModel(modelId),
    system: translationSystem(targetLang, instruction),
    prompt: text,
    temperature: 0.4,
  });

  return result.toTextStreamResponse();
}
