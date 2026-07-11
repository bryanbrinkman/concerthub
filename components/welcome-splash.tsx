"use client";

import * as React from "react";
import Link from "next/link";
import { Frame, LogIn, X } from "lucide-react";

import { signInAction } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";

/**
 * First-visit splash for signed-out visitors: a short pitch for what
 * Concert Collect is. Shown once per browser (localStorage).
 */

const DISMISS_KEY = "cc-welcome-dismissed";

const POINTS = [
  {
    icon: Frame,
    text: "Archive the posters, ticket stubs, wristbands, and merch from every concert you've attended.",
  },
];

export function WelcomeSplash({
  enabled,
  authEnabled,
  googleEnabled,
}: {
  enabled: boolean;
  authEnabled: boolean;
  googleEnabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (enabled && !window.localStorage.getItem(DISMISS_KEY)) {
      setOpen(true);
    }
  }, [enabled]);

  const dismiss = React.useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Concert Collect"
    >
      <div className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-3 top-3 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Concert Collect — every show, everything it left behind"
          className="mx-auto w-64 max-w-full"
        />

        <div className="mt-5 space-y-3">
          {POINTS.map((point) => (
            <div key={point.text} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <point.icon className="h-4 w-4" />
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">
                {point.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          {authEnabled && googleEnabled ? (
            <form action={signInAction}>
              <Button type="submit" className="w-full">
                <LogIn />
                Sign in with Google to start your archive
              </Button>
            </form>
          ) : null}
          {authEnabled ? (
            <Button
              variant={googleEnabled ? "secondary" : "default"}
              className="w-full"
              asChild
            >
              <Link href="/login?mode=signup" onClick={dismiss}>
                {googleEnabled ? (
                  "Or create an account with a username"
                ) : (
                  <>
                    <LogIn />
                    Create an account to start your archive
                  </>
                )}
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" className="w-full" onClick={dismiss}>
            Look around first
          </Button>
        </div>
      </div>
    </div>
  );
}
