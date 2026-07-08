"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  CalendarDays,
  Download,
  Frame,
  ListMusic,
  NotebookPen,
  Sparkles,
  X,
} from "lucide-react";

import { seedDemoAction } from "@/app/seed-actions";
import { Button } from "@/components/ui/button";

/**
 * First-run welcome for new accounts: shown when the signed-in user's
 * archive is empty and they haven't dismissed it. Dismissal is remembered
 * per browser (localStorage) — no DB round-trip needed.
 */

const DISMISS_KEY = "cc-onboarding-dismissed";

const TOUR: Array<{ icon: typeof ListMusic; title: string; text: string }> = [
  {
    icon: ListMusic,
    title: "Setlists come alive",
    text: "Show pages pull the real setlist from setlist.fm automatically — hit the play circle on any song for a preview.",
  },
  {
    icon: Frame,
    title: "The poster is the star",
    text: "Add print artwork to a show and it hangs on your front-page wall. Fan through everything on the Posters rack.",
  },
  {
    icon: NotebookPen,
    title: "Keep the whole night",
    text: "Ticket stubs, wristbands, merch, photos, and your own written memory all live on the show page.",
  },
  {
    icon: ArrowLeftRight,
    title: "Trade with collectors",
    text: "The Trading Post shows everyone's prints — raise a hand on a grail and the owner gets your contact info.",
  },
];

export function Onboarding({ enabled }: { enabled: boolean }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Concert Collect"
    >
      <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
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
          alt="Concert Collect"
          className="mx-auto -my-12 w-64 max-w-full"
        />
        <p className="mt-1 text-sm text-muted-foreground">
          Your shows. Your story. Let&apos;s get your archive started —
          pick whichever feels right:
        </p>

        {/* Fill-your-archive options */}
        <div className="mt-5 space-y-2">
          <Button className="w-full justify-start" asChild>
            <Link href="/import" onClick={dismiss}>
              <Download />
              Import your setlist.fm history
              <span className="ml-auto text-xs text-muted-foreground">
                fastest
              </span>
            </Link>
          </Button>
          <Button variant="secondary" className="w-full justify-start" asChild>
            <Link href="/add/show" onClick={dismiss}>
              <CalendarDays />
              Add your first show by hand
            </Link>
          </Button>
          <form action={seedDemoAction} onSubmit={dismiss}>
            <Button
              type="submit"
              variant="outline"
              className="w-full justify-start"
            >
              <Sparkles />
              Explore with a few demo shows
            </Button>
          </form>
        </div>

        {/* Mini tour */}
        <div className="mt-6 space-y-3 border-t border-border pt-5">
          {TOUR.map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={dismiss}
            className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip for now — don&apos;t show this again
          </button>
        </div>
      </div>
    </div>
  );
}
