"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  Frame,
  ListMusic,
  LogIn,
  NotebookPen,
  X,
} from "lucide-react";

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
  {
    icon: ListMusic,
    text: "Every show gets its real setlist automatically — with playable song previews.",
  },
  {
    icon: NotebookPen,
    text: "Keep photos and your own written memory of the night, before it fades.",
  },
  {
    icon: ArrowLeftRight,
    text: "Browse other collectors' prints on the Trading Post and raise a hand on a grail.",
  },
];

export function WelcomeSplash({
  enabled,
  authEnabled,
}: {
  enabled: boolean;
  authEnabled: boolean;
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

        <p className="font-serif text-2xl font-bold leading-tight">
          Concert
          <br />
          Collect
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Your shows. Your story.
        </p>

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
          {authEnabled ? (
            <form action={signInAction}>
              <Button type="submit" className="w-full">
                <LogIn />
                Sign in with Google to start your archive
              </Button>
            </form>
          ) : null}
          <Button variant="outline" className="w-full" onClick={dismiss}>
            Look around first
          </Button>
        </div>
      </div>
    </div>
  );
}
