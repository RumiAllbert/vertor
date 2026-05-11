import Link from "next/link";
import { SoftAurora } from "./soft-aurora";

export function Hero({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Aurora — tightly radial-masked so it reads as a soft glow behind the
          wordmark, not a section-wide wash. Text below sits on clean parchment. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse 55% 42% at 50% 42%, black 0%, rgba(0,0,0,0.7) 45%, transparent 78%)",
          maskImage:
            "radial-gradient(ellipse 55% 42% at 50% 42%, black 0%, rgba(0,0,0,0.7) 45%, transparent 78%)",
        }}
      >
        <SoftAurora
          color1="#0056e3"
          color2="#e864fa"
          speed={0.45}
          scale={0.55}
          brightness={0.85}
          noiseFrequency={3.2}
          noiseAmplitude={1.2}
          bandHeight={0.5}
          bandSpread={1.0}
          octaveDecay={0.36}
          layerOffset={0.6}
          colorSpeed={1.6}
          enableMouseInteraction
          mouseInfluence={0.1}
        />
      </div>

      {/* Editorial eyebrow */}
      <p
        className="blur-up small-caps relative z-10 mb-8"
        style={{ animationDelay: "0ms" }}
      >
        An editorial workspace
      </p>

      {/* Wordmark — no chrome, no glass, just type */}
      <h1
        className="display blur-up relative z-10 text-[22vw] leading-[0.85] tracking-[-0.02em] md:text-[200px] md:leading-[0.85]"
        style={{ animationDelay: "80ms" }}
      >
        Vertor
      </h1>

      {/* Hairline rule, framed by the Latin gloss — printed-page feel */}
      <div
        className="blur-up relative z-10 mt-10 flex w-full max-w-[640px] items-center gap-5 px-4"
        style={{ animationDelay: "220ms" }}
      >
        <span aria-hidden className="h-px flex-1 bg-hairline/70" />
        <p className="display whitespace-nowrap text-[15px] italic text-muted-foreground md:text-[17px]">
          from <span className="not-italic font-medium text-foreground">vertere</span>
          <span className="mx-1.5 opacity-50">·</span>
          to turn, to render, to translate
        </p>
        <span aria-hidden className="h-px flex-1 bg-hairline/70" />
      </div>

      {/* Plain-prose tagline */}
      <p
        className="blur-up relative z-10 mt-6 max-w-[42ch] text-[15px] text-muted-foreground md:text-[16px]"
        style={{ animationDelay: "320ms" }}
      >
        A workspace for translators, writers, and editors.
      </p>

      {/* CTAs */}
      <div
        className="blur-up relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-7"
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

      <a
        href="#showcase"
        aria-label="Scroll down"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-muted-foreground transition-colors hover:text-foreground"
      >
        ↓
      </a>
    </section>
  );
}
