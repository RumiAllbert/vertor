import { NextRequest } from "next/server";
import { z } from "zod";
import { auth, authEnabled } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";

const PostBody = z.object({
  title: z.string().default("Untitled"),
  sourceText: z.string().default(""),
  translatedText: z.string().default(""),
  sourceLang: z.string().default("auto"),
  targetLang: z.string().default("en"),
  modelId: z.string().default("gemini-3.1-pro-preview"),
});

async function getUserId() {
  if (!authEnabled) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const db = getDb();
  if (!db) return Response.json({ documents: [] });
  const userId = await getUserId();
  if (!userId) return Response.json({ documents: [] });

  const rows = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.userId, userId))
    .orderBy(desc(schema.documents.updatedAt))
    .limit(100);

  return Response.json({ documents: rows });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  if (!db) return new Response("db not configured", { status: 503 });
  const userId = await getUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });

  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const [row] = await db
    .insert(schema.documents)
    .values({ ...parsed.data, userId })
    .returning();
  return Response.json({ document: row });
}
