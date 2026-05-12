"use client";
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SoftAurora } from "./soft-aurora";

/* --------------------------------- Intro ---------------------------------
 *
 * Aurora-only opening — about a second and a half — then the wordmark
 * settles in and the supporting lines cascade beneath it. Plays once per
 * session; respects prefers-reduced-motion (snaps to the composed state).
 * --------------------------------------------------------------------- */

const INITIAL_DELAY = 1500; // aurora-only pause before the cascade begins
const INTRO_FLAG = "vertor.intro.shown";

type Phase = "waiting" | "done";

// useLayoutEffect runs before paint on the client (so we can decide play-vs-
// skip without flicker), but warns if used during SSR. Standard isomorphic
// fallback to useEffect on the server.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function Hero({ authEnabled }: { authEnabled: boolean }) {
  const sectionRef = React.useRef<HTMLElement>(null);

  // Initial state matches between SSR and the first client render:
  //   • "done" so SSR HTML / no-JS users get the fully composed hero with
  //     the normal blur-up cascade.
  //   • If JS decides to play the intro, useIsoLayoutEffect flips state to
  //     "waiting" before the browser paints — the user only ever sees the
  //     waiting state, no flash of "done".
  const [phase, setPhase] = React.useState<Phase>("done");

  useIsoLayoutEffect(() => {
    let skip = false;
    try {
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const seen = sessionStorage.getItem(INTRO_FLAG) === "1";
      skip = Boolean(reduced) || seen;
    } catch {
      // If sessionStorage is unavailable, err on the side of playing.
    }

    if (skip) return; // SSR "done" state already shows the full hero.

    setPhase("waiting");

    const revealTimer = setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(INTRO_FLAG, "1");
      } catch {}
    }, INITIAL_DELAY);

    return () => clearTimeout(revealTimer);
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

  // Supporting elements keep their blur-up animations paused until the
  // aurora opening ends, then resume in cascade. animation-delay is paused
  // along with play-state, so each element's delay counts down from the
  // moment phase becomes "done".
  const blurUpStyle = (delayMs: number): React.CSSProperties => ({
    animationPlayState: phase === "done" ? "running" : "paused",
    animationDelay: `${delayMs}ms`,
  });

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
        {/* Wordmark — during the aurora-only opening it's mounted but at
            opacity 0 so its layout height stays reserved. When phase flips
            to "done" the .wordmark-settle keyframe runs (420ms scale +
            letter-spacing collapse). */}
        <h1
          className={cn(
            "display wordmark-crisp text-[22vw] leading-[0.85] tracking-[-0.02em] md:text-[200px] md:leading-[0.85]",
            phase === "done" && "wordmark-settle",
          )}
          style={phase === "waiting" ? { opacity: 0 } : undefined}
        >
          Vertor
        </h1>

        {/* Hairline rule, framed by the Latin gloss */}
        <div
          className="blur-up mt-10 flex w-full max-w-[760px] items-center gap-5 px-4"
          style={blurUpStyle(180)}
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
          style={blurUpStyle(360)}
        >
          A workspace for translators, writers, and editors.
        </p>

        {/* CTAs */}
        <div
          className="blur-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-7"
          style={blurUpStyle(540)}
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
