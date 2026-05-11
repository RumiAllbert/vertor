import Link from "next/link";

export function Closing({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 text-center">
      <blockquote className="display max-w-[40ch] text-[36px] italic leading-[1.2] text-foreground/85 md:text-[48px]">
        “A translator is a writer who writes in another&rsquo;s voice. The work is invisible — and yet, without it, nothing carries across.”
      </blockquote>
      <figcaption className="mt-8 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        Vertor
      </figcaption>

      <div className="mt-16 flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
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
            or sign in with Google
          </a>
        )}
      </div>

      <footer className="mt-28 flex w-full max-w-3xl items-baseline justify-between border-t border-hairline pt-5 text-[11px] italic text-muted-foreground">
        <span>Vertor · 2026</span>
        <span>
          Built by{" "}
          <a
            href="https://rumiallbert.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="not-italic font-medium text-foreground underline decoration-hairline underline-offset-[4px] transition-colors hover:decoration-ink"
          >
            Rumi
          </a>
        </span>
      </footer>
    </section>
  );
}
