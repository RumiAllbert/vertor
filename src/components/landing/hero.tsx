import Link from "next/link";
import { SoftAurora } from "./soft-aurora";

export function Hero({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Aurora — fills the section, masked at top/bottom so it bleeds into the page edges */}
      <div
        aria-hidden
        className="pointer-events-auto absolute inset-0 z-0"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <SoftAurora
          color1="#0056e3"
          color2="#e864fa"
          speed={0.6}
          scale={0.5}
          brightness={1}
          noiseFrequency={4}
          noiseAmplitude={1.5}
          bandHeight={0.55}
          bandSpread={1.1}
          octaveDecay={0.34}
          layerOffset={0.65}
          colorSpeed={2.1}
          enableMouseInteraction
          mouseInfluence={0.15}
        />
      </div>

      {/* Wordmark sits in the open — full impact, no chrome */}
      <h1
        className="display blur-up relative z-10 text-[20vw] leading-[0.9] tracking-tight md:text-[180px] md:leading-[0.9]"
        style={{ animationDelay: "60ms" }}
      >
        Vertor
      </h1>

      {/* Frosted card — glass backdrop is masked with a radial fade so its
          edges dissolve into the aurora instead of forming a hard rectangle. */}
      <div
        className="blur-up relative z-10 mt-8 px-12 py-10 md:px-20 md:py-12"
        style={{ animationDelay: "240ms" }}
      >
        {/* Soft glass layer — masked so it fades to transparent at the edges */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-background/40 backdrop-blur-xl backdrop-saturate-150"
          style={{
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 95% at center, black 35%, transparent 100%)",
            maskImage:
              "radial-gradient(ellipse 75% 95% at center, black 35%, transparent 100%)",
          }}
        />

        {/* Content sits on top of the masked glass */}
        <div className="relative flex flex-col items-center">
          <p className="display max-w-[46ch] text-center text-[18px] italic text-muted-foreground md:text-[22px]">
            from <span className="not-italic font-medium text-foreground">vertere</span>, Latin —
            to turn, to render, to translate.
          </p>
          <p className="mt-5 max-w-[38ch] text-center text-[15px] text-muted-foreground md:text-[16px]">
            A workspace for translators, writers, and editors.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
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
