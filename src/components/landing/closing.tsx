import Link from "next/link";

export function Closing({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <blockquote className="display max-w-[36ch] text-[28px] italic leading-[1.25] text-foreground/85 md:text-[34px]">
        “A translator is a writer who writes in another’s voice. The work is invisible — and yet, without it, nothing carries across.”
      </blockquote>
      <figcaption className="mt-6 text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
        Vertor
      </figcaption>

      <div className="mt-14 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
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
            or sign in with Google
          </a>
        )}
      </div>

      <footer className="mt-24 w-full max-w-3xl border-t border-hairline pt-4 text-center text-[10.5px] italic text-muted-foreground">
        Vertor · 2026 · Built on Vercel
      </footer>
    </section>
  );
}
