import { NextRequest } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import { resolveModel } from "@/lib/model-client";
import { detectionSystem } from "@/lib/prompts";
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
const DETECT_MODEL_ID = "gemini-3.1-flash-lite-preview";

const Body = z.object({
  text: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response("bad request", { status: 400 });

  // Sample first ~1500 chars — that's plenty for language ID and keeps it cheap.
  const sample = parsed.data.text.slice(0, 1500);

  const quota = await consumeRateLimit(req, DETECT_MODEL_ID);
  if (!quota.allowed) return rateLimitResponse(quota);

  const { text } = await generateText({
    model: resolveModel(DETECT_MODEL_ID),
    system: detectionSystem(),
    prompt: sample,
    temperature: 0,
  });

  const lang = text.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 10);
  return Response.json({ lang: lang || "und" });
}
