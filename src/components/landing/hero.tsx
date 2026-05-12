"use client";
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SoftAurora } from "./soft-aurora";

/* --------------------------------- Intro ---------------------------------
 *
 * The wordmark cycles through translations of "to translate" before settling
 * on "Vertor". Visit-once via sessionStorage; respects prefers-reduced-motion.
 *
 * The cycle is paced like a slowing wheel: the early frames flick by, the
 * later ones linger, and Vertor lands with a scale + letter-spacing collapse.
 * --------------------------------------------------------------------- */

const FIRST_WORD = "vertere";
const CYCLE: { word: string; at: number }[] = [
  { word: "traduire",   at: 130 },
  { word: "übersetzen", at: 260 },
  { word: "翻訳",        at: 390 },
  { word: "перевод",    at: 530 },
  { word: "traducción", at: 700 },
];
const SETTLE_AT = 880; // wordmark lands on "Vertor" and supporting elements blur-up
const INTRO_FLAG = "vertor.intro.shown";

type Phase = "pre" | "playing" | "done";

export function Hero({ authEnabled }: { authEnabled: boolean }) {
  const sectionRef = React.useRef<HTMLElement>(null);

  // Intro state. Starts in "pre" on both server and client so the SSR'd HTML
  // renders the final wordmark; the useEffect below decides whether to play.
  const [phase, setPhase] = React.useState<Phase>("pre");
  const [word, setWord] = React.useState("Vertor");

  // Decide whether to play the intro on mount, then run it.
  React.useEffect(() => {
    let skip = false;
    try {
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const seen = sessionStorage.getItem(INTRO_FLAG) === "1";
      skip = Boolean(reduced) || seen;
    } catch {
      // If sessionStorage is unavailable (e.g., third-party cookie blockers),
      // err on the side of playing the intro — it's lightweight.
    }

    if (skip) {
      setPhase("done");
      return;
    }

    setWord(FIRST_WORD);
    setPhase("playing");

    const cycleTimers = CYCLE.map((c) =>
      setTimeout(() => setWord(c.word), c.at),
    );
    const settleTimer = setTimeout(() => {
      setWord("Vertor");
      // Phase flips to "done" simultaneously — supporting elements start
      // their blur-up cascade while the wordmark's settle animation is
      // still finishing, so the whole composition arrives in one breath.
      setPhase("done");
      try {
        sessionStorage.setItem(INTRO_FLAG, "1");
      } catch {}
    }, SETTLE_AT);

    return () => {
      cycleTimers.forEach(clearTimeout);
      clearTimeout(settleTimer);
    };
  }, []);

  /* ----- Scroll-bound fade — drives --scroll-out via rAF, no re-renders. */
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const denom = Math.max(1, rect.height * 0.6);
      const p = Math.max(0, Math.min(1, -rect.top / denom));
      el.style.setProperty("--scroll-out", String(p));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Supporting elements (eyebrow, hairline, tagline, CTAs) keep their
  // blur-up animations paused until the intro finishes, then resume in
  // cascade. animation-delay is paused along with play-state, so each
  // element's delay counts down from the moment phase becomes "done".
  const blurUpStyle = (delayMs: number): React.CSSProperties => ({
    animationPlayState: phase === "done" ? "running" : "paused",
    animationDelay: `${delayMs}ms`,
  });

  // Pick the wordmark's animation class.
  // - During cycle frames: .wordmark-cycle (fast blur-flick)
  // - When the final word lands: .wordmark-settle (slower, letter-spacing collapse)
  // - Skip case (phase === "done" without play): no class — just static
  const wordmarkAnim =
    phase === "playing"
      ? word === "Vertor"
        ? "wordmark-settle"
        : "wordmark-cycle"
      : phase === "done" && word === "Vertor" && wasPlaying.current
        ? "wordmark-settle"
        : "";
  // (The settle animation stays pinned even after phase flips to "done", so
  // it has time to finish playing on the same DOM node.)

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      {/* Aurora — fades out as the hero scrolls away */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 will-change-[opacity]"
        style={{
          opacity: "calc(1 - var(--scroll-out, 0) * 1.4)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 45% at 50% 48%, black 0%, rgba(0,0,0,0.75) 50%, transparent 85%)",
          maskImage:
            "radial-gradient(ellipse 60% 45% at 50% 48%, black 0%, rgba(0,0,0,0.75) 50%, transparent 85%)",
        }}
      >
        <SoftAurora
          color1="#0056e3"
          color2="#e864fa"
          speed={0.5}
          scale={0.55}
          brightness={0.95}
          noiseFrequency={3.6}
          noiseAmplitude={1.35}
          bandHeight={0.5}
          bandSpread={1.0}
          octaveDecay={0.35}
          layerOffset={0.62}
          colorSpeed={1.8}
          enableMouseInteraction
          mouseInfluence={0.12}
        />
      </div>

      {/* Content stack — single scroll-bound transform on the wrapper. */}
      <div
        className="relative z-10 flex flex-col items-center will-change-transform"
        style={{
          transform:
            "translateY(calc(var(--scroll-out, 0) * -32px)) scale(calc(1 - var(--scroll-out, 0) * 0.04))",
          opacity: "calc(1 - var(--scroll-out, 0) * 1.15)",
          transformOrigin: "center 45%",
        }}
      >
        {/* Editorial eyebrow */}
        <p className="blur-up small-caps mb-8" style={blurUpStyle(0)}>
          An editorial workspace
        </p>

        {/* Wordmark — keyed on `word` so each cycle frame remounts and the
            CSS animation fires fresh. */}
        <h1
          key={word}
          className={cn(
            "display wordmark-crisp text-[22vw] leading-[0.85] tracking-[-0.02em] md:text-[200px] md:leading-[0.85]",
            wordmarkAnim,
          )}
        >
          {word}
        </h1>

        {/* Hairline rule, framed by the Latin gloss */}
        <div
          className="blur-up mt-10 flex w-full max-w-[760px] items-center gap-5 px-4"
          style={blurUpStyle(140)}
        >
          <span aria-hidden className="h-px flex-1 bg-hairline/70" />
          <p className="display subtext-crisp whitespace-nowrap text-[18px] italic text-foreground/90 md:text-[22px]">
            from <span className="not-italic font-medium text-foreground">vertere</span>
            <span className="mx-1.5 opacity-50">·</span>
            to turn, to render, to translate
          </p>
          <span aria-hidden className="h-px flex-1 bg-hairline/70" />
        </div>

        {/* Plain-prose tagline */}
        <p
          className="blur-up subtext-crisp mt-6 max-w-[44ch] text-[17px] font-medium text-foreground/85 md:text-[19px]"
          style={blurUpStyle(240)}
        >
          A workspace for translators, writers, and editors.
        </p>

        {/* CTAs */}
        <div
          className="blur-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-7"
          style={blurUpStyle(340)}
        >
          <Link
            href="/app"
            className="inline-flex h-11 items-center gap-2 rounded-sm border border-foreground bg-foreground px-6 text-[14px] font-medium tracking-tight text-background shadow-[2px_2px_0_var(--ink)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--ink)]"
          >
            Start writing
            <span aria-hidden className="font-mono text-[11px] opacity-60">↵</span>
          </Link>
          {authEnabled && (
            <a
              href="/sign-in"
              className="text-[14px] italic text-muted-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-ink"
            >
              or sign in with Google to keep your history
            </a>
          )}
        </div>
      </div>

      <a
        href="#showcase"
        aria-label="Scroll down"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-muted-foreground transition-colors hover:text-foreground"
        style={{ opacity: "calc(1 - var(--scroll-out, 0) * 2.5)" }}
      >
        ↓
      </a>
    </section>
  );
}

// Track whether the intro actually played, so the settle animation runs
// even after phase flips to "done" (the wordmark element gets re-keyed to
// "Vertor" and we want it to land, not snap).
const wasPlaying = { current: false };
