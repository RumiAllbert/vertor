import { NextRequest } from "next/server";
import { z } from "zod";
import { auth, authEnabled } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  docs: z
    .array(
      z.object({
        title: z.string().default("Untitled"),
        sourceText: z.string().default(""),
        translatedText: z.string().default(""),
        sourceLang: z.string().default("auto"),
        targetLang: z.string().default("en"),
        modelId: z.string().default("gemini-3.1-flash-lite-preview"),
        createdAt: z.number().optional(),
        updatedAt: z.number().optional(),
      }),
    )
    .min(1)
    .max(500),
});

export async function POST(req: NextRequest) {
  if (!authEnabled) return new Response("auth not configured", { status: 503 });
  const db = getDb();
  if (!db) return new Response("db not configured", { status: 503 });
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("unauthorized", { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const rows = parsed.data.docs.map((d) => ({
    userId,
    title: d.title,
    sourceText: d.sourceText,
    translatedText: d.translatedText,
    sourceLang: d.sourceLang,
    targetLang: d.targetLang,
    modelId: d.modelId,
    ...(d.createdAt ? { createdAt: new Date(d.createdAt) } : {}),
    ...(d.updatedAt ? { updatedAt: new Date(d.updatedAt) } : {}),
  }));

  const inserted = await db.insert(schema.documents).values(rows).returning();
  return Response.json({ inserted: inserted.length, documents: inserted });
}
