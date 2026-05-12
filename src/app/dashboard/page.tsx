import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, authEnabled } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { computeStats, type StatDoc, WEEKDAYS } from "@/lib/stats";
import { languageName } from "@/lib/languages";
import {
  maybeGeneratePersonality,
  PERSONALITY_UNLOCK_THRESHOLD,
} from "@/lib/personality";
import type { PersonalityValue } from "@/lib/db/schema";
import { ThemeToggle } from "@/components/theme-toggle";
import { KpiCard } from "./_components/kpi-card";
import { PersonalityCard } from "./_components/personality-card";
import { LanguageBars } from "./_components/language-bars";
import { ActivitySparkline } from "./_components/activity-sparkline";
import { ModelsList } from "./_components/models-list";
import { RecentList } from "./_components/recent-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function greet(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name?: string | null, email?: string | null): string {
  if (name) return name.split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return "there";
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default async function DashboardPage() {
  if (!authEnabled) {
    return <Unavailable reason="Sign-in is not configured in this environment." />;
  }
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/dashboard");
  }

  const db = getDb();
  if (!db) {
    return <Unavailable reason="The database is not configured." />;
  }

  const [userRow] = await db
    .select({
      createdAt: schema.users.createdAt,
      name: schema.users.name,
      email: schema.users.email,
      personality: schema.users.personality,
      personalityDocCount: schema.users.personalityDocCount,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);

  const rows = await db
    .select({
      id: schema.documents.id,
      title: schema.documents.title,
      sourceText: schema.documents.sourceText,
      sourceLang: schema.documents.sourceLang,
      targetLang: schema.documents.targetLang,
      modelId: schema.documents.modelId,
      createdAt: schema.documents.createdAt,
      updatedAt: schema.documents.updatedAt,
    })
    .from(schema.documents)
    .where(eq(schema.documents.userId, session.user.id));

  const docs = rows as StatDoc[];
  const stats = computeStats(docs, userRow?.createdAt ?? null);

  let personality: PersonalityValue | null = userRow?.personality ?? null;
  if (session.user.id && stats.totalDocs >= PERSONALITY_UNLOCK_THRESHOLD) {
    personality = await maybeGeneratePersonality({
      userId: session.user.id,
      totalDocs: stats.totalDocs,
      storedDocCount: userRow?.personalityDocCount ?? 0,
      existing: personality,
      docs,
      stats,
    });
  }

  const totalActivity30 = stats.activityLast30.reduce((a, b) => a + b.count, 0);
  const memberSinceLabel = stats.memberSince ? formatMonthYear(stats.memberSince) : "—";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-8 pt-8 md:px-12">
        <Link href="/" className="display text-[20px] leading-none">
          Vertor
        </Link>
        <nav className="flex items-center gap-5 text-[12px]">
          <ThemeToggle />
          <Link
            href="/app"
            className="text-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink"
          >
            Open app →
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl px-8 pb-24 pt-14 md:px-12">
        <section className="mb-12">
          <h1 className="display text-[44px] italic leading-[1.05] md:text-[56px]">
            {greet(new Date())}, {firstName(userRow?.name, userRow?.email)}.
          </h1>
          <p className="mt-3 text-[13px] italic text-muted-foreground">
            Member since {memberSinceLabel} · {stats.totalDocs} translation{stats.totalDocs === 1 ? "" : "s"}
          </p>
        </section>

        {stats.totalDocs === 0 ? (
          <EmptyState />
        ) : (
          <>
            <section className="mb-14 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-hairline bg-hairline md:grid-cols-4">
              <KpiCard label="Translations" value={stats.totalDocs.toLocaleString()} />
              <KpiCard label="Words translated" value={stats.totalWords.toLocaleString()} />
              <KpiCard label="Languages reached" value={stats.languagesReached.toLocaleString()} />
              <KpiCard label="Avg words / doc" value={stats.avgWordsPerDoc.toLocaleString()} />
            </section>

            <section className="mb-14">
              <PersonalityCard
                personality={personality}
                totalDocs={stats.totalDocs}
                threshold={PERSONALITY_UNLOCK_THRESHOLD}
              />
            </section>

            <div className="grid gap-14 md:grid-cols-2">
              <section>
                <SectionLabel>Languages reached</SectionLabel>
                <LanguageBars items={stats.topLanguages} />
                {stats.topPair && (
                  <p className="mt-5 text-[12px] italic text-muted-foreground">
                    Top pair · <span className="not-italic text-foreground">
                      {stats.topPair.sourceName} → {stats.topPair.targetName}
                    </span> · {stats.topPair.count} translation{stats.topPair.count === 1 ? "" : "s"}
                  </p>
                )}
              </section>

              <section>
                <SectionLabel>Activity · last 30 days</SectionLabel>
                <ActivitySparkline data={stats.activityLast30} />
                <p className="mt-3 text-[12px] italic text-muted-foreground">
                  <span className="not-italic text-foreground">{totalActivity30}</span> in window
                  {stats.mostActiveWeekday !== null && (
                    <>
                      {" "}· most active on{" "}
                      <span className="not-italic text-foreground">
                        {WEEKDAYS[stats.mostActiveWeekday]}
                      </span>
                    </>
                  )}
                </p>
              </section>

              <section>
                <SectionLabel>Models used</SectionLabel>
                <ModelsList items={stats.modelsUsed} />
              </section>

              <section>
                <SectionLabel>Longest translation</SectionLabel>
                {stats.longest ? (
                  <Link
                    href={`/app?doc=${stats.longest.id}`}
                    className="group block"
                  >
                    <div className="display text-[40px] italic leading-none">
                      {stats.longest.words.toLocaleString()}{" "}
                      <span className="text-[18px] not-italic text-muted-foreground">words</span>
                    </div>
                    <div className="mt-2 truncate text-[13px] text-muted-foreground underline decoration-hairline underline-offset-[6px] transition-colors group-hover:text-foreground group-hover:decoration-ink">
                      {stats.longest.title}
                    </div>
                  </Link>
                ) : (
                  <p className="text-[13px] italic text-muted-foreground">No translations yet.</p>
                )}
              </section>
            </div>

            <section className="mt-16">
              <SectionLabel>Recent</SectionLabel>
              <RecentList items={stats.recent.map((r) => ({
                ...r,
                sourceName: r.sourceLang === "auto" ? "auto" : languageName(r.sourceLang),
                targetName: languageName(r.targetLang),
              }))} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-baseline justify-between border-b border-hairline pb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      <span>{children}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-hairline bg-card px-8 py-14 text-center">
      <p className="display text-[24px] italic text-foreground/85">No translations yet.</p>
      <p className="mt-3 text-[13px] italic text-muted-foreground">
        Once you translate a document, your stats will live here.
      </p>
      <Link
        href="/app"
        className="mt-6 inline-block text-[13px] text-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink"
      >
        Translate something →
      </Link>
    </div>
  );
}

function Unavailable({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-8 pt-8 md:px-12">
        <Link href="/" className="display text-[20px] leading-none">
          Vertor
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl px-8 pt-32 text-center md:px-12">
        <p className="display text-[28px] italic">Dashboard unavailable</p>
        <p className="mt-3 text-[13px] italic text-muted-foreground">{reason}</p>
        <Link
          href="/app"
          className="mt-6 inline-block text-[13px] underline decoration-hairline decoration-1 underline-offset-[6px] hover:decoration-ink"
        >
          Back to app →
        </Link>
      </main>
    </div>
  );
}
