import { NextRequest } from "next/server";
import { z } from "zod";
import { auth, authEnabled } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

const PatchBody = z.object({
  title: z.string().optional(),
  sourceText: z.string().optional(),
  translatedText: z.string().optional(),
  sourceLang: z.string().optional(),
  targetLang: z.string().optional(),
  modelId: z.string().optional(),
});

async function getUserId() {
  if (!authEnabled) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb();
  if (!db) return new Response("db not configured", { status: 503 });
  const userId = await getUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });

  const { id } = await params;
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const [row] = await db
    .update(schema.documents)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, userId)))
    .returning();
  return Response.json({ document: row });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb();
  if (!db) return new Response("db not configured", { status: 503 });
  const userId = await getUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });

  const { id } = await params;
  await db
    .delete(schema.documents)
    .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, userId)));
  return Response.json({ ok: true });
}
