import { NextRequest } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import { resolveModel } from "@/lib/model-client";
import { titleSystem } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  source: z.string().min(20),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response("bad request", { status: 400 });

  // First ~2000 chars is plenty for titling — keeps Flash Lite calls fast/cheap.
  const sample = parsed.data.source.slice(0, 2000);

  const { text } = await generateText({
    model: resolveModel("gemini-3.1-flash-lite-preview"),
    system: titleSystem(),
    prompt: sample,
    temperature: 0.5,
  });

  // Belt and suspenders — the prompt asks for no quotes/punctuation but
  // models sometimes ignore that. Clean up.
  const title = text
    .trim()
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, "") // strip wrapping quotes
    .replace(/[.!?,;:]+$/g, "") // strip trailing punctuation
    .replace(/\s+/g, " ")
    .slice(0, 120);

  return Response.json({ title: title || "Untitled" });
}
