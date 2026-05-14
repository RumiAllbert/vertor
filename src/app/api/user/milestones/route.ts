import { auth, authEnabled } from "@/lib/auth";
import { getUserStats } from "@/lib/stats";

export const runtime = "nodejs";

export async function GET() {
  if (!authEnabled) return Response.json({ milestones: [] });
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("unauthorized", { status: 401 });

  const stats = await getUserStats(userId);
  return Response.json({ milestones: stats?.milestones ?? [] });
}
