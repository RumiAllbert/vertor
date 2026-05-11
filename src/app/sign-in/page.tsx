import { signIn, authEnabled } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default function SignInPage() {
  if (!authEnabled) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            V
          </div>
          <h1 className="text-lg font-semibold">Vertor</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Auth is not configured yet. Vertor runs in local mode — your history is saved in the browser.
          </p>
          <Button asChild className="mt-6 w-full">
            <a href="/">Open Vertor</a>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
          V
        </div>
        <h1 className="text-xl font-semibold">Sign in to Vertor</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sync your documents across devices and unlock the model council.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
            redirect("/");
          }}
          className="mt-6"
        >
          <Button type="submit" className="w-full" size="lg">
            Continue with Google
          </Button>
        </form>
        <p className="mt-4 text-[11px] text-muted-foreground">
          By continuing you agree to be a thoughtful translator.
        </p>
      </div>
    </main>
  );
}
