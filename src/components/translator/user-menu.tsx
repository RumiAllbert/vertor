"use client";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SessionInfo = {
  enabled: boolean;
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
};

function initials(name?: string | null, email?: string | null) {
  const src = (name ?? email ?? "").trim();
  if (!src) return "·";
  const parts = src.split(/\s+/);
  if (parts.length === 1) return src.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({ session }: { session: SessionInfo }) {
  if (!session.enabled) {
    return (
      <span className="hidden text-[10.5px] italic text-muted-foreground md:inline">
        Local mode
      </span>
    );
  }
  if (!session.user) {
    return (
      <a
        href="/sign-in?callbackUrl=/app"
        className="inline-flex h-8 items-center text-[12px] underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink"
      >
        Sign in
      </a>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-card text-[10px] font-medium tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Account"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name ?? "user"}
            className="h-7 w-7 rounded-full"
          />
        ) : (
          initials(session.user.name, session.user.email)
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium">{session.user.name ?? "Signed in"}</span>
            {session.user.email && (
              <span className="text-[11px] font-normal italic text-muted-foreground">
                {session.user.email}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="text-[13px]">
          <a href="/api/auth/signout">Sign out</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
