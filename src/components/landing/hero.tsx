"use client";
import * as React from "react";
import Link from "next/link";
import { SoftAurora } from "./soft-aurora";

export function Hero({ authEnabled }: { authEnabled: boolean }) {
  const sectionRef = React.useRef<HTMLElement>(null);

  // Scroll-bound fade — drives a single CSS custom property (--scroll-out)
  // from 0 (hero fully in view) to 1 (hero scrolled away). All scroll-bound
  // visual effects below are pure CSS calc() expressions reading this var,
  // so we avoid React re-renders and keep the animation on the compositor.
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
      // Complete the fade by the time the hero is ~60% scrolled away — feels
      // more cinematic than dragging it out across the full section height.
      const denom = Math.max(1, rect.height * 0.6);
      const p = Math.max(0, Math.min(1, -rect.top / denom));
      el.style.setProperty("--scroll-out", String(p));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      {/* Aurora — fades out as the hero scrolls away. Mask kept identical so
          the bloom shape is consistent; only the opacity scales with scroll. */}
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

      {/* Content stack — composes a single scroll-bound transform on the
          wrapper so the children's blur-up mount animations don't fight us. */}
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
        <p
          className="blur-up small-caps mb-8"
          style={{ animationDelay: "0ms" }}
        >
          An editorial workspace
        </p>

        {/* Wordmark */}
        <h1
          className="display wordmark-crisp blur-up text-[22vw] leading-[0.85] tracking-[-0.02em] md:text-[200px] md:leading-[0.85]"
          style={{ animationDelay: "80ms" }}
        >
          Vertor
        </h1>

        {/* Hairline rule, framed by the Latin gloss — printed-page feel */}
        <div
          className="blur-up mt-10 flex w-full max-w-[760px] items-center gap-5 px-4"
          style={{ animationDelay: "220ms" }}
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
          style={{ animationDelay: "320ms" }}
        >
          A workspace for translators, writers, and editors.
        </p>

        {/* CTAs */}
        <div
          className="blur-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-7"
          style={{ animationDelay: "420ms" }}
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
              href="/api/auth/signin"
              className="text-[14px] italic text-muted-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-ink"
            >
              or sign in with Google to keep your history
            </a>
          )}
        </div>
      </div>

      {/* Scroll cue — fades out faster than the content so it's gone by the
          time you've committed to scrolling. */}
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
