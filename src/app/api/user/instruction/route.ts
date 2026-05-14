import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth, authEnabled } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import type { UserInstructionValue } from "@/lib/db/schema";

export const runtime = "nodejs";

const EMPTY: UserInstructionValue = { current: "", presets: [] };

const PresetSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(48),
  instruction: z.string().min(1).max(2000),
  createdAt: z.number().int().nonnegative(),
});

const PatchBody = z.object({
  current: z.string().max(2000).optional(),
  presets: z.array(PresetSchema).max(100).optional(),
});

async function getUserId() {
  if (!authEnabled) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const db = getDb();
  if (!db) return Response.json(EMPTY);
  const userId = await getUserId();
  if (!userId) return Response.json(EMPTY);

  const [row] = await db
    .select({ instruction: schema.users.instruction })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return Response.json(row?.instruction ?? EMPTY);
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  if (!db) return new Response("db not configured", { status: 503 });
  const userId = await getUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const [row] = await db
    .select({ instruction: schema.users.instruction })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  const prev = row?.instruction ?? EMPTY;
  const next: UserInstructionValue = {
    current: parsed.data.current ?? prev.current,
    presets: parsed.data.presets ?? prev.presets,
  };

  await db
    .update(schema.users)
    .set({ instruction: next })
    .where(eq(schema.users.id, userId));

  return Response.json(next);
}
