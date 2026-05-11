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
            "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
        }}
      >
        <SoftAurora />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <h1
          className="display blur-up text-[14vw] leading-[0.95] md:text-[120px] md:leading-[0.95]"
          style={{ animationDelay: "60ms" }}
        >
          Vertor
        </h1>
        <p
          className="display blur-up mt-6 max-w-[40ch] text-[15px] italic text-muted-foreground md:text-[17px]"
          style={{ animationDelay: "260ms" }}
        >
          from <span className="not-italic font-medium text-foreground">vertere</span>, Latin —
          to turn, to render, to translate.
        </p>
        <p
          className="blur-up mt-10 max-w-[34ch] text-[13.5px] text-muted-foreground"
          style={{ animationDelay: "420ms" }}
        >
          A workspace for translators, writers, and editors.
        </p>
        <div
          className="blur-up mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-5"
          style={{ animationDelay: "580ms" }}
        >
          <Link
            href="/app"
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-foreground bg-foreground px-5 text-[13px] font-medium tracking-tight text-background shadow-[2px_2px_0_var(--ink)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--ink)]"
          >
            Start writing
            <span aria-hidden className="font-mono text-[11px] opacity-60">↵</span>
          </Link>
          {authEnabled && (
            <a
              href="/api/auth/signin"
              className="text-[13px] italic text-muted-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-ink"
            >
              or sign in with Google to keep your history
            </a>
          )}
        </div>
      </div>

      <a
        href="#preview"
        aria-label="Scroll down"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-muted-foreground transition-colors hover:text-foreground"
      >
        ↓
      </a>
    </section>
  );
}
