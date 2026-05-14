import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, authEnabled } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { computeStats, type StatDoc, WEEKDAYS, wordEquivalent } from "@/lib/stats";
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
import { YearHeatmap } from "./_components/year-heatmap";
import { Milestones } from "./_components/milestones";
import { HourRhythm } from "./_components/hour-rhythm";
import { SoftAurora } from "@/components/landing/soft-aurora";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Good night" is a *farewell*, not a hello — keep this list to greetings the
// reader can be welcomed with at any hour they actually open the page.
function greet(d: Date): string {
  const h = d.getHours();
  if (h < 3) return "Still up";
  if (h < 5) return "Up early";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Burning the midnight oil";
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
    <div className="relative isolate min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Aurora lives at the page level so it can bleed across the whole
          background while staying behind all dashboard content. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-[-28vw] top-[-26vh] -z-10 h-[118vh] opacity-55"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse 72% 56% at 50% 34%, black 0%, rgba(0,0,0,0.74) 42%, rgba(0,0,0,0.28) 70%, transparent 100%)",
          maskImage:
            "radial-gradient(ellipse 72% 56% at 50% 34%, black 0%, rgba(0,0,0,0.74) 42%, rgba(0,0,0,0.28) 70%, transparent 100%)",
        }}
      >
        <SoftAurora
          color1="#0056e3"
          color2="#ff6f61"
          speed={0.18}
          scale={0.82}
          brightness={0.42}
          noiseFrequency={2.4}
          noiseAmplitude={1.15}
          bandHeight={0.36}
          bandSpread={1.15}
          enableMouseInteraction={false}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-[-22vw] top-[34vh] -z-10 h-[90vh] opacity-35"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse 62% 42% at 56% 42%, black 0%, rgba(0,0,0,0.42) 56%, transparent 92%)",
          maskImage:
            "radial-gradient(ellipse 62% 42% at 56% 42%, black 0%, rgba(0,0,0,0.42) 56%, transparent 92%)",
        }}
      >
        <SoftAurora
          color1="#12a594"
          color2="#f7b538"
          speed={0.12}
          scale={1.05}
          brightness={0.24}
          noiseFrequency={1.9}
          noiseAmplitude={0.95}
          bandHeight={0.48}
          bandSpread={0.95}
          layerOffset={1.2}
          enableMouseInteraction={false}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between px-8 pt-8 md:px-12">
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

      <main className="relative z-10 mx-auto w-full max-w-5xl px-8 pb-24 pt-14 md:px-12">
        <section className="relative mb-12">
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
            <section className="mb-14 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-hairline bg-hairline/80 shadow-[0_24px_80px_color-mix(in_oklch,var(--ink)_9%,transparent)] md:grid-cols-4">
              <KpiCard label="Translations" value={stats.totalDocs.toLocaleString()} accent="#0056e3" />
              <KpiCard
                label="Words translated"
                value={stats.totalWords.toLocaleString()}
                hint={wordEquivalent(stats.totalWords)}
                accent="#e85d75"
              />
              <KpiCard label="Languages reached" value={stats.languagesReached.toLocaleString()} accent="#12a594" />
              <KpiCard
                label="Current streak"
                value={`${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`}
                accent="#f4a261"
                hint={
                  stats.longestStreak > 0
                    ? `Best yet · ${stats.longestStreak} day${stats.longestStreak === 1 ? "" : "s"}`
                    : null
                }
              />
            </section>

            <section className="mb-14">
              <PersonalityCard
                personality={personality}
                totalDocs={stats.totalDocs}
                threshold={PERSONALITY_UNLOCK_THRESHOLD}
              />
            </section>

            <section className="mb-14">
              <Milestones items={stats.milestones} />
            </section>

            <section className="mb-14">
              <SectionLabel>The year in glance</SectionLabel>
              <YearHeatmap data={stats.activityYear} />
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
                <SectionLabel>The last 30 days</SectionLabel>
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
                <SectionLabel>Hours of the day</SectionLabel>
                <HourRhythm rhythm={stats.hourRhythm} peakHour={stats.peakHour} />
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
