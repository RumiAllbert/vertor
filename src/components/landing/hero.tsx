import Link from "next/link";
import { SoftAurora } from "./soft-aurora";

export function Hero({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      >
        <SoftAurora
          color1="#8aa5d0"
          color2="#9c6680"
          brightness={0.62}
          scale={1.5}
          bandSpread={2.0}
          mouseInfluence={0.1}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <h1
          className="display blur-up text-[20vw] leading-[0.9] tracking-tight md:text-[180px] md:leading-[0.9]"
          style={{ animationDelay: "60ms" }}
        >
          Vertor
        </h1>
        <p
          className="display blur-up mt-8 max-w-[46ch] text-[18px] italic text-muted-foreground md:text-[22px]"
          style={{ animationDelay: "260ms" }}
        >
          from <span className="not-italic font-medium text-foreground">vertere</span>, Latin —
          to turn, to render, to translate.
        </p>
        <p
          className="blur-up mt-12 max-w-[38ch] text-[16px] text-muted-foreground md:text-[17px]"
          style={{ animationDelay: "420ms" }}
        >
          A workspace for translators, writers, and editors.
        </p>
        <div
          className="blur-up mt-12 flex flex-col items-center gap-3 sm:flex-row sm:gap-6"
          style={{ animationDelay: "580ms" }}
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
