import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth, authEnabled } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

async function getUserId() {
  if (!authEnabled) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}

function readableTimestamp(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> },
) {
  const db = getDb();
  if (!db) return new Response("db not configured", { status: 503 });
  const userId = await getUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });

  const { id: documentId, revisionId } = await params;

  const [original] = await db
    .select()
    .from(schema.revisions)
    .where(
      and(
        eq(schema.revisions.id, revisionId),
        eq(schema.revisions.documentId, documentId),
        eq(schema.revisions.userId, userId),
      ),
    )
    .limit(1);
  if (!original) return new Response("not found", { status: 404 });

  const [restored] = await db
    .insert(schema.revisions)
    .values({
      id: nanoid(),
      documentId,
      userId,
      kind: "restored",
      modelId: original.modelId ?? null,
      summary: `Restored from ${readableTimestamp(original.ts)}`,
      sourceText: original.sourceText,
      translatedText: original.translatedText,
    })
    .returning();

  const [document] = await db
    .update(schema.documents)
    .set({
      sourceText: original.sourceText,
      translatedText: original.translatedText,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.documents.id, documentId), eq(schema.documents.userId, userId)))
    .returning();

  return Response.json({ revision: restored, document });
}
