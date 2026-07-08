import Link from "next/link";
import { ArrowRight, Frame, ListMusic, NotebookPen, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Concert Collect — every show, everything it left behind"
        className="mx-auto w-72 max-w-full"
      />

      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          About Concert Collect
        </h1>
        <p className="mx-auto max-w-xl leading-relaxed text-muted-foreground">
          Concert Collect was made by{" "}
          <span className="font-medium text-foreground">Bryan Brinkman</span>{" "}
          because he loves to collect and cherish memories — the poster that
          hung on the merch table, the stub that survived the wash, the
          setlist you argued about on the drive home.
        </p>
        <p className="mx-auto max-w-xl leading-relaxed text-muted-foreground">
          A show only lasts a night. This is a place for everything it left
          behind: a database of live music history built around shows, with
          posters, tickets, merch, setlists, photos, and your own written
          memories as the artifacts that prove you were there.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Frame, label: "Posters, front and center" },
          { icon: Ticket, label: "Stubs, wristbands & merch" },
          { icon: ListMusic, label: "Real setlists, playable" },
          { icon: NotebookPen, label: "Memories in your words" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card/60 p-4 text-center"
          >
            <item.icon className="h-5 w-5 text-primary" />
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Button asChild>
          <Link href="/">
            Start your archive
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
