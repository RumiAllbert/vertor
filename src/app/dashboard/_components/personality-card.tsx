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
  const reachedThreshold = totalDocs >= threshold;
  const unlocked = personality && reachedThreshold;
  const progress = Math.min(totalDocs, threshold) / threshold;
  const remaining = Math.max(0, threshold - totalDocs);
  // Personality hasn't generated yet but the user is past the threshold —
  // most likely the previous generation request failed. Tell them that, and
  // hint that a refresh kicks off another attempt (the dashboard route does
  // this automatically on each load).
  const pending = !personality && reachedThreshold;

  const traitColors = ["#0056e3", "#e85d75", "#12a594", "#f4a261"];

  return (
    <div className="relative overflow-hidden rounded-md border border-hairline bg-card/88 px-8 py-10 shadow-[0_24px_90px_color-mix(in_oklch,var(--ink)_10%,transparent)] backdrop-blur-[2px] md:px-12 md:py-14">
      <div
        aria-hidden
        className="absolute -right-16 -top-24 h-56 w-56 rounded-full opacity-25 blur-2xl"
        style={{
          background:
            "conic-gradient(from 120deg, #0056e3, #e85d75, #f4a261, #12a594, #0056e3)",
        }}
      />
      <div aria-hidden className="absolute bottom-6 right-7 hidden rotate-[-10deg] md:block">
        <div className="grid h-24 w-24 place-items-center rounded-full border border-ink/25 bg-background/65 shadow-[0_16px_48px_color-mix(in_oklch,var(--ink)_14%,transparent)]">
          <span className="display text-[52px] leading-none text-ink/80">
            {unlocked ? personality.title.charAt(0) : "V"}
          </span>
        </div>
      </div>

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
          <ul className="mt-6 flex max-w-2xl flex-wrap gap-2.5">
            {personality.traits.map((trait, index) => (
              <li
                key={trait}
                className="rotate-[-1deg] rounded-[4px] border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] shadow-[0_10px_30px_color-mix(in_oklch,var(--trait-accent)_12%,transparent)] even:rotate-[1deg]"
                style={{
                  "--trait-accent": traitColors[index % traitColors.length],
                  borderColor: "color-mix(in oklch, var(--trait-accent) 42%, var(--hairline))",
                  background:
                    "color-mix(in oklch, var(--trait-accent) 11%, var(--background))",
                  color: "color-mix(in oklch, var(--trait-accent) 68%, var(--foreground))",
                } as React.CSSProperties}
              >
                {trait.toLowerCase()}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[11px] italic text-muted-foreground">
            Refreshes every {threshold} translations · last updated {formatRelative(personality.generatedAt)}
          </p>
        </>
      ) : pending ? (
        <>
          <h2 className="display text-[28px] italic text-foreground/70 md:text-[34px]">
            Composing your portrait…
          </h2>
          <p className="mt-3 max-w-xl text-[13px] italic text-muted-foreground">
            We&apos;re reading your last few translations to write a small editorial
            sketch of you. Refresh in a moment — if it still hasn&apos;t arrived,
            the model briefly stumbled and will try again on the next visit.
          </p>
          <div className="mt-7 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span aria-hidden className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ink" />
            <span className="font-mono uppercase tracking-[0.18em]">drafting</span>
          </div>
        </>
      ) : (
        <>
          <h2 className="display text-[28px] italic text-foreground/55 md:text-[34px]">
            Unlocks after {threshold} translations
          </h2>
          <p className="mt-3 text-[13px] italic text-muted-foreground">
            {remaining} to go — keep translating.
          </p>
          <div className="mt-7 h-1 w-full overflow-hidden rounded-full bg-hairline/70">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0056e3,#e85d75,#f4a261)] transition-all"
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
