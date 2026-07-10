import Link from "next/link";
import { CalendarDays, Download, Plus, Search, Sparkles, UserPlus } from "lucide-react";

import { seedDemoAction } from "@/app/seed-actions";
import {
  allShows,
  archiveCounts,
  getArchive,
  postersForShow,
} from "@/lib/archive";
import { getExploreData, type ExplorePoster } from "@/lib/explore";
import { formatShortDate, formatShowDate } from "@/lib/utils";
import type { GradientKey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TicketArt } from "@/components/ticket-art";

/**
 * Public homepage. Deliberately editorial, four sections only:
 * search → poster wall → recently archived shows → build your archive.
 * The database-completeness views live on /explore.
 */

// Each chip routes to the index that can actually answer it — poster
// artists and editions go to /posters (which searches designer/title),
// bands/venues to /shows.
const EXAMPLE_SEARCHES: Array<{ label: string; href: string }> = [
  { label: "Rilo Kiley Capitol Theatre", href: `/shows?q=${encodeURIComponent("Rilo Kiley Capitol Theatre")}` },
  { label: "Daniel Danger", href: `/posters?q=${encodeURIComponent("Daniel Danger")}` },
  { label: "Foil poster", href: `/posters?q=${encodeURIComponent("Foil")}` },
  { label: "Jeff Lynne's ELO", href: `/shows?q=${encodeURIComponent("Jeff Lynne's ELO")}` },
  { label: "Franz Ferdinand", href: `/shows?q=${encodeURIComponent("Franz Ferdinand")}` },
];

export default async function HomePage() {
  const archive = await getArchive();
  const counts = archiveCounts(archive);
  const explore = await getExploreData();

  // Wall imagery: the shared archive when it has posters, otherwise the
  // viewer's own collection (demo mode ships seeded art).
  const wall: ExplorePoster[] =
    explore && explore.featured.length > 0
      ? explore.featured
      : allShows(archive).flatMap((show) => {
          const poster = postersForShow(archive, show.id).find(
            (p) => p.imageUrl,
          );
          if (!poster) return [];
          const artist = archive.artists.find((a) => a.id === show.artistId);
          const venue = archive.venues.find((v) => v.id === show.venueId);
          return [
            {
              id: poster.id,
              imageUrl: poster.imageUrl as string,
              artistName: artist?.name,
              venueName: venue?.name,
              showDate: show.date,
              year: poster.year,
              designer: poster.designer,
              state: "own" as const,
            },
          ];
        });

  const recentShows = explore?.recentShows ?? [];
  const myShowIds = new Set(archive.shows.map((s) => s.id));
  const signedIn = !archive.demo;
  const hasArchive = signedIn && archive.shows.length > 0;

  return (
    <div className="space-y-14 pb-6">
      {/* ---- 1 · Hero: search live music history ---- */}
      <section className="mx-auto max-w-3xl space-y-5 pt-8 text-center sm:pt-14">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Every show. Everything it left behind.
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground sm:text-lg">
          Your personal archive for the concerts you&apos;ve been to — posters,
          ticket stubs, setlists, and the memories behind them.
        </p>

        <form action="/shows" method="get" className="mx-auto flex max-w-2xl gap-2 pt-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="Search an artist, venue, show, or poster…"
              className="h-13 w-full rounded-xl border border-border bg-secondary pl-11 pr-4 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-14"
            />
          </div>
          <Button type="submit" size="lg" className="h-13 px-6 sm:h-14">
            Explore
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
          <span>Try:</span>
          {EXAMPLE_SEARCHES.map((ex) => (
            <Link
              key={ex.label}
              href={ex.href}
              className="rounded-full border border-border px-2.5 py-1 transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {ex.label}
            </Link>
          ))}
        </div>

        <div className="pt-1">
          <Button size="lg" asChild>
            <Link href={signedIn ? "/add" : "/login?mode=signup"}>
              <Plus />
              {signedIn ? "Add to your archive" : "Start your free archive"}
            </Link>
          </Button>
        </div>
      </section>

      {/* ---- 2 · Poster wall: discover concert posters ---- */}
      {wall.length > 0 ? (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight">
              From the Archive
            </h2>
            <Link
              href="/posters"
              className="text-sm text-primary transition-colors hover:text-primary/80"
            >
              Browse all posters →
            </Link>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 scrollbar-none sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
            {wall.map((poster) => (
              <Link
                key={poster.id}
                href={`/posters/${poster.id}`}
                className="group relative block h-56 shrink-0 snap-start overflow-hidden rounded-md border border-white/[0.06] sm:h-64 lg:h-72"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster.imageUrl}
                  alt={`${poster.artistName ?? "Concert poster"} — art by ${poster.designer}`}
                  loading="lazy"
                  className="h-full w-auto max-w-none transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/25 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {poster.artistName ? (
                    <p className="truncate text-sm font-medium text-white">
                      {poster.artistName}
                    </p>
                  ) : null}
                  <p className="truncate text-xs text-white/75">
                    {[
                      poster.venueName,
                      poster.showDate
                        ? formatShortDate(poster.showDate)
                        : String(poster.year),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {poster.designer && poster.designer !== "Unknown" ? (
                    <p className="truncate text-xs text-white/60">
                      Art by {poster.designer}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---- 3 · Recently archived shows ---- */}
      {recentShows.length > 0 ? (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight">
              Recently Archived
            </h2>
            <Link
              href="/shows"
              className="text-sm text-primary transition-colors hover:text-primary/80"
            >
              Explore shows →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {recentShows.map((show) => {
              const href = myShowIds.has(show.id)
                ? `/shows/${show.id}`
                : show.posterId
                  ? `/posters/${show.posterId}`
                  : `/shows?q=${encodeURIComponent(show.artistName)}`;
              return (
                <Link key={show.id} href={href} className="group block">
                  <TicketArt
                    seedId={show.id}
                    gradient={(show.gradient ?? "midnight") as GradientKey}
                    artist={show.artistName}
                    venue={show.venueName}
                    cityLine={show.venueCity}
                    dateLine={formatShowDate(show.date)}
                    tourLine="Archived Show"
                    className="transition-transform duration-300 group-hover:-translate-y-1"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
                    <Badge variant="outline">
                      {show.artifacts} artifact{show.artifacts === 1 ? "" : "s"}
                    </Badge>
                    {show.posterImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={show.posterImage}
                        alt=""
                        loading="lazy"
                        className="h-10 w-8 rounded-sm border border-white/10 bg-black/40 object-contain"
                      />
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ---- 4 · Build your archive ---- */}
      <section
        id="build"
        className="rounded-2xl border border-border bg-card px-6 py-10 text-center sm:px-10 sm:py-14"
      >
        {hasArchive ? (
          <>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Your archive is growing.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              {counts.shows} show{counts.shows === 1 ? "" : "s"} ·{" "}
              {counts.posters} poster{counts.posters === 1 ? "" : "s"} ·{" "}
              {counts.tickets} ticket stub{counts.tickets === 1 ? "" : "s"} —
              keep the history coming.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/my-shows">
                  <CalendarDays />
                  My Shows
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/import">
                  <Download />
                  Import more from setlist.fm
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Your concert history is already out there.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Import your setlist.fm history and start building your live
              music archive.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/import">
                  <Download />
                  Import from setlist.fm
                </Link>
              </Button>
              {signedIn ? (
                <>
                  <Button variant="secondary" asChild>
                    <Link href="/add/show">
                      <CalendarDays />
                      Add a show by hand
                    </Link>
                  </Button>
                  <form action={seedDemoAction}>
                    <Button variant="outline" type="submit">
                      <Sparkles />
                      Copy the demo shows
                    </Button>
                  </form>
                </>
              ) : (
                <Button variant="secondary" asChild>
                  <Link href="/login?mode=signup">
                    <UserPlus />
                    Create an account
                  </Link>
                </Button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
