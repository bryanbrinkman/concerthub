"use client";

import Link from "next/link";

/**
 * Page-level error boundary: catches errors from a route's render while
 * keeping the sidebar/layout intact, so a single broken page never white-
 * screens the whole app. (Layout-level errors fall through to
 * app/global-error.tsx.)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground">
        This page hit an unexpected error. Try again, or head back to the
        archive.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={() => reset()}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border bg-white/[0.06] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/[0.12]"
        >
          Go home
        </Link>
      </div>
      {error.digest ? (
        <p className="text-xs text-muted-foreground/60">
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
