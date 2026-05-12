"use client";
import * as React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SessionInfo } from "@/components/translator/user-menu";

export function MarketingHeader({ session }: { session: SessionInfo }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-8 py-6 md:px-12">
      <Link href="/" className="display text-[20px] leading-none">
        Vertor
      </Link>
      <nav className="flex items-center gap-5 text-[12px]">
        <ThemeToggle />
        {session.enabled && !session.user && (
          <a
            href="/sign-in"
            className="text-muted-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-ink"
          >
            Sign in
          </a>
        )}
        {session.user && (
          <Link
            href="/dashboard"
            className="text-muted-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-ink"
          >
            Dashboard
          </Link>
        )}
        <Link
          href="/app"
          className="text-foreground underline decoration-hairline decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink"
        >
          Open app →
        </Link>
      </nav>
    </header>
  );
}
