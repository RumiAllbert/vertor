import { NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth, authEnabled } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

const REVISION_CAP = 50;

const PostBody = z.object({
  id: z.string().min(1).optional(),
  kind: z.enum(["translated", "variation", "edit", "restored"]),
  modelId: z.string().optional(),
  summary: z.string().max(200).optional(),
  sourceText: z.string(),
  translatedText: z.string(),
});

async function getUserId() {
  if (!authEnabled) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}

async function assertOwnsDocument(
  db: NonNullable<ReturnType<typeof getDb>>,
  userId: string,
  documentId: string,
) {
  const [row] = await db
    .select({ id: schema.documents.id })
    .from(schema.documents)
    .where(
      and(eq(schema.documents.id, documentId), eq(schema.documents.userId, userId)),
    )
    .limit(1);
  return Boolean(row);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb();
  if (!db) return new Response("db not configured", { status: 503 });
  const userId = await getUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });

  const { id: documentId } = await params;
  if (!(await assertOwnsDocument(db, userId, documentId))) {
    return new Response("not found", { status: 404 });
  }

  const rows = await db
    .select()
    .from(schema.revisions)
    .where(eq(schema.revisions.documentId, documentId))
    .orderBy(desc(schema.revisions.ts))
    .limit(REVISION_CAP);

  return Response.json({ revisions: rows });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb();
  if (!db) return new Response("db not configured", { status: 503 });
  const userId = await getUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });

  const { id: documentId } = await params;
  if (!(await assertOwnsDocument(db, userId, documentId))) {
    return new Response("not found", { status: 404 });
  }

  const parsed = PostBody.safeParse(await req.json());
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const [inserted] = await db
    .insert(schema.revisions)
    .values({
      id: parsed.data.id ?? nanoid(),
      documentId,
      userId,
      kind: parsed.data.kind,
      modelId: parsed.data.modelId,
      summary: parsed.data.summary,
      sourceText: parsed.data.sourceText,
      translatedText: parsed.data.translatedText,
    })
    .returning();

  // Trim to last REVISION_CAP. Best-effort; failure here doesn't roll back
  // the insert above — the cap is a courtesy, not a correctness gate.
  await db.execute(sql`
    DELETE FROM "revision"
    WHERE "documentId" = ${documentId}
      AND "id" NOT IN (
        SELECT "id" FROM "revision"
        WHERE "documentId" = ${documentId}
        ORDER BY "ts" DESC
        LIMIT ${REVISION_CAP}
      )
  `);

  return Response.json({ revision: inserted });
}
