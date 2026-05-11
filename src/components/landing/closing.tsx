import Link from "next/link";

const REPO_URL = "https://github.com/RumiAllbert/vertor";
const CONTACT_EMAIL = "rumiallbert@gmail.com";

// Plain-text template for feature requests. encodeURIComponent runs once at
// module load — keeps the JSX legible and ensures newlines render as %0A.
const FEATURE_REQUEST_SUBJECT = "Vertor — feature request";
const FEATURE_REQUEST_BODY = `Hi Rumi,

What would you like Vertor to do that it doesn't yet?

(a sentence or two)


Why would it help your workflow?

(a paragraph is plenty — who you are, what you translate, where Vertor falls short today)


Examples or references (optional):

(links, screenshots, prior art in other tools)


—
Sent from vertor.vercel.app`;

const FEATURE_REQUEST_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  FEATURE_REQUEST_SUBJECT,
)}&body=${encodeURIComponent(FEATURE_REQUEST_BODY)}`;

export function Closing({ authEnabled }: { authEnabled: boolean }) {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 text-center">
      <blockquote className="display max-w-[40ch] text-[36px] italic leading-[1.2] text-foreground/85 md:text-[48px]">
        “Writers make national literature, while translators make universal literature.”
      </blockquote>
      <figcaption className="mt-8 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        José Saramago
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
            href="/sign-in"
            className="text-[14px] italic text-muted-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-ink"
          >
            or sign in with Google
          </a>
        )}
      </div>

      <footer className="mt-28 w-full max-w-3xl border-t border-hairline pt-5 text-[11px] italic text-muted-foreground">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <span>Vertor · 2026 · MIT</span>
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
        </div>
        <nav className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <FooterLink href={REPO_URL} external>
            Open source
          </FooterLink>
          <FooterDot />
          <FooterLink href={`mailto:${CONTACT_EMAIL}`}>Contact</FooterLink>
          <FooterDot />
          <FooterLink href={FEATURE_REQUEST_HREF}>Feature request</FooterLink>
          <FooterDot />
          <FooterLink href={`${REPO_URL}/issues/new`} external>
            Report a bug
          </FooterLink>
        </nav>
      </footer>
    </section>
  );
}

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const externalProps = external
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};
  return (
    <a
      href={href}
      {...externalProps}
      className="text-[10.5px] uppercase tracking-[0.2em] not-italic text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </a>
  );
}

function FooterDot() {
  return (
    <span aria-hidden className="not-italic text-muted-foreground/40">
      ·
    </span>
  );
}
