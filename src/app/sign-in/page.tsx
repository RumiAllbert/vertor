import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, authEnabled, signIn } from "@/lib/auth";
import { SoftAurora } from "@/components/landing/soft-aurora";

// Only allow same-origin redirects to prevent open-redirect via ?callbackUrl=.
function safeCallback(cb: string | undefined): string {
  if (!cb) return "/app";
  if (!cb.startsWith("/")) return "/app";
  if (cb.startsWith("//")) return "/app"; // protocol-relative escape
  return cb;
}

type Search = { callbackUrl?: string; error?: string };

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  const params = (await searchParams) ?? {};
  const callbackUrl = safeCallback(params.callbackUrl);
  const hasError = typeof params.error === "string" && params.error.length > 0;

  // Already signed in — skip the page entirely.
  if (authEnabled) {
    const session = await auth();
    if (session?.user) redirect(callbackUrl);
  }

  if (!authEnabled) return <UnconfiguredView />;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
      {/* Subtle aurora — same palette as Hero, dialed way down so the card
          stays the focal point. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-60 dark:opacity-90"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse 55% 38% at 50% 50%, black 0%, rgba(0,0,0,0.7) 50%, transparent 82%)",
          maskImage:
            "radial-gradient(ellipse 55% 38% at 50% 50%, black 0%, rgba(0,0,0,0.7) 50%, transparent 82%)",
        }}
      >
        <SoftAurora
          color1="#0056e3"
          color2="#e864fa"
          speed={0.35}
          scale={0.6}
          brightness={0.7}
          noiseFrequency={3}
          noiseAmplitude={1.1}
          bandHeight={0.45}
          bandSpread={0.95}
          octaveDecay={0.36}
          layerOffset={0.6}
          colorSpeed={1.4}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        {/* Wordmark — links back home */}
        <Link
          href="/"
          className="display wordmark-crisp blur-up text-[56px] italic leading-none tracking-tight md:text-[72px]"
          style={{ animationDelay: "0ms" }}
        >
          Vertor
        </Link>

        {/* Hairline-flanked editorial label */}
        <div
          className="blur-up mt-8 flex w-full items-center gap-4"
          style={{ animationDelay: "120ms" }}
        >
          <span aria-hidden className="h-px flex-1 bg-hairline/70" />
          <span className="small-caps">Sign in</span>
          <span aria-hidden className="h-px flex-1 bg-hairline/70" />
        </div>

        {/* Description */}
        <p
          className="blur-up subtext-crisp mt-7 max-w-[34ch] text-[15px] leading-relaxed text-foreground/80 md:text-[16px]"
          style={{ animationDelay: "220ms" }}
        >
          Keep your translations across devices.
          <br />
          Pick any model. Pick up where you left off.
        </p>

        {/* Google sign-in — editorial offset-shadow button with the Google G
            placed on a parchment chip per Google's branding guidance. */}
        <form
          action={async (formData) => {
            "use server";
            const cb = safeCallback(formData.get("callbackUrl")?.toString());
            await signIn("google", { redirectTo: cb });
          }}
          className="blur-up mt-9 w-full"
          style={{ animationDelay: "320ms" }}
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <button
            type="submit"
            className="group inline-flex h-12 w-full items-center justify-center gap-3 rounded-sm border border-foreground bg-foreground px-6 text-[14px] font-medium tracking-tight text-background shadow-[2px_2px_0_var(--ink)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--ink)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_var(--ink)]"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[3px] bg-background">
              <GoogleG className="h-3.5 w-3.5" />
            </span>
            Continue with Google
            <span aria-hidden className="font-mono text-[11px] opacity-60">↵</span>
          </button>
        </form>

        {/* Error surface — only renders when Auth.js bounces back with ?error= */}
        {hasError && (
          <p
            className="blur-up mt-5 max-w-[34ch] text-[12px] italic text-destructive"
            style={{ animationDelay: "360ms" }}
          >
            Something interrupted the sign-in. Try again, or continue without
            an account below.
          </p>
        )}

        {/* Footnote */}
        <p
          className="blur-up mt-6 text-[11px] italic text-muted-foreground"
          style={{ animationDelay: "420ms" }}
        >
          By continuing you agree to be a thoughtful translator.
        </p>

        {/* Escape hatch — local-mode entry */}
        <Link
          href="/app"
          className="blur-up mt-10 text-[12px] italic text-muted-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-ink"
          style={{ animationDelay: "520ms" }}
        >
          or continue without an account
        </Link>
      </div>
    </main>
  );
}

/* ---------------- Local-mode (auth not configured) ---------------- */

function UnconfiguredView() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <Link
          href="/"
          className="display wordmark-crisp blur-up text-[56px] italic leading-none tracking-tight md:text-[72px]"
        >
          Vertor
        </Link>

        <div className="blur-up mt-8 flex w-full items-center gap-4">
          <span aria-hidden className="h-px flex-1 bg-hairline/70" />
          <span className="small-caps">Local mode</span>
          <span aria-hidden className="h-px flex-1 bg-hairline/70" />
        </div>

        <p className="blur-up mt-7 max-w-[34ch] text-[15px] leading-relaxed text-foreground/80 md:text-[16px]">
          Auth isn&rsquo;t configured on this instance.
          <br />
          Your history is saved in this browser.
        </p>

        <Link
          href="/app"
          className="blur-up mt-9 inline-flex h-12 items-center gap-2 rounded-sm border border-foreground bg-foreground px-7 text-[14px] font-medium tracking-tight text-background shadow-[2px_2px_0_var(--ink)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--ink)]"
        >
          Open Vertor
          <span aria-hidden className="font-mono text-[11px] opacity-60">↵</span>
        </Link>
      </div>
    </main>
  );
}

/* ---------------- Google G mark ---------------- */

function GoogleG({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
