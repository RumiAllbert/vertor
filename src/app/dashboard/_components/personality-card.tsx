import type { PersonalityValue } from "@/lib/db/schema";

export function PersonalityCard({
  personality,
  totalDocs,
  threshold,
}: {
  personality: PersonalityValue | null;
  totalDocs: number;
  threshold: number;
}) {
  const unlocked = personality && totalDocs >= threshold;
  const progress = Math.min(totalDocs, threshold) / threshold;
  const remaining = Math.max(0, threshold - totalDocs);

  return (
    <div className="relative rounded-md border border-hairline bg-card px-8 py-10 md:px-12 md:py-14">
      <div className="mb-4 text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
        Translator personality
      </div>

      {unlocked ? (
        <>
          <h2 className="display text-[34px] italic leading-[1.05] md:text-[42px]">
            {personality.title}
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-foreground/90">
            {personality.blurb}
          </p>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {personality.traits.map((t) => t.toLowerCase()).join("  ·  ")}
          </p>
          <p className="mt-6 text-[11px] italic text-muted-foreground">
            Refreshes every {threshold} translations · last updated {formatRelative(personality.generatedAt)}
          </p>
        </>
      ) : (
        <>
          <h2 className="display text-[28px] italic text-foreground/55 md:text-[34px]">
            Unlocks after {threshold} translations
          </h2>
          <p className="mt-3 text-[13px] italic text-muted-foreground">
            {remaining} to go — keep translating.
          </p>
          <div className="mt-7 h-px w-full bg-hairline">
            <div
              className="h-px bg-ink transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "just now";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
