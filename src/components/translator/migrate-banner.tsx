"use client";
import * as React from "react";
import { X } from "lucide-react";
import type { LocalDoc } from "@/lib/doc-store";

type Props = {
  localDocs: LocalDoc[];
  userKey: string;
  onMigrate: () => Promise<void>;
  onDismiss: () => void;
};

export function MigrateBanner({ localDocs, userKey, onMigrate, onDismiss }: Props) {
  const dismissKey = `vertor.migrate.dismissed.${userKey}`;
  const [dismissed, setDismissed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  if (dismissed || localDocs.length === 0) return null;

  const dismiss = (persist: boolean) => {
    if (persist) localStorage.setItem(dismissKey, "1");
    setDismissed(true);
    onDismiss();
  };

  const migrate = async () => {
    setBusy(true);
    setError(null);
    try {
      await onMigrate();
      dismiss(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Migration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-up mx-3 mt-3 rounded-sm border border-hairline bg-ink/[0.06] px-3 py-2.5 text-[12px]">
      <div className="font-medium leading-snug">
        You have {localDocs.length} local {localDocs.length === 1 ? "document" : "documents"}.
      </div>
      <p className="mt-0.5 italic text-muted-foreground">
        Move them to your account so they sync across devices?
      </p>
      {error && (
        <p className="mt-1 text-[11px] italic text-destructive">{error}</p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          onClick={migrate}
          disabled={busy}
          className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-foreground bg-foreground px-2.5 text-[11.5px] font-medium text-background shadow-[2px_2px_0_var(--ink)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--ink)] disabled:opacity-50"
        >
          {busy ? "Moving…" : "Move to cloud"}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dismiss(true)}
            className="text-[11px] italic text-muted-foreground underline decoration-hairline underline-offset-[6px] hover:text-foreground"
          >
            keep local
          </button>
          <button onClick={() => dismiss(true)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
