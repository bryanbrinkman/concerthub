import Link from "next/link";
import {
  ArrowLeftRight,
  CalendarDays,
  Download,
  Image as ImageIcon,
  MapPin,
  Paintbrush,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import { seedDemoAction } from "@/app/seed-actions";
import {
  allShows,
  archiveCounts,
  getArchive,
  postersForShow,
} from "@/lib/archive";
import { getExploreData, type ExplorePoster } from "@/lib/explore";
import { formatShortDate } from "@/lib/utils";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";

/**
 * Public homepage. Deliberately editorial: search → poster wall → browse →
 * build your archive. The database-completeness views live on /explore.
 */

const BROWSE = [
  { label: "Posters", href: "/posters", icon: ImageIcon },
  { label: "Shows", href: "/shows", icon: CalendarDays },
  { label: "Performers", href: "/artists", icon: Users },
  { label: "Venues", href: "/venues", icon: MapPin },
  { label: "Poster Artists", href: "/poster-artists", icon: Paintbrush },
  { label: "Trading Post", href: "/trading", icon: ArrowLeftRight },
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

  const signedIn = !archive.demo;
  const hasArchive = signedIn && archive.shows.length > 0;

  return (
    <div className="space-y-14 pb-6">
      <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />

      {/* ---- 1 · Hero: search live music history ---- */}
      <section className="mx-auto max-w-3xl space-y-5 pt-8 text-center sm:pt-14">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          The definitive archive for concert posters.
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground sm:text-lg">
          Explore the art, artists, editions, and variants behind live music —
          and the shows that made them.
        </p>

        <form action="/posters" method="get" className="mx-auto flex max-w-2xl gap-2 pt-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="Search posters, poster artists, bands…"
              className="h-13 w-full rounded-xl border border-border bg-secondary pl-11 pr-4 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-14"
            />
          </div>
          <Button type="submit" size="lg" className="h-13 px-6 sm:h-14">
            Search
          </Button>
        </form>

        <div className="pt-2">
          <Button
            size="lg"
            asChild
            className="h-14 rounded-xl border-transparent bg-gradient-to-r from-amber-400 to-amber-500 px-9 text-base font-semibold text-stone-950 shadow-lg shadow-amber-900/40 transition-all hover:from-amber-300 hover:to-amber-400 hover:shadow-amber-800/50 [&_svg]:size-5"
          >
            <Link href={signedIn ? "/add" : "/login?mode=signup"}>
              <Plus />
              {signedIn ? "Add to your archive" : "Start your free archive"}
            </Link>
          </Button>
        </div>
      </section>

      {/* First-run: signed in with an empty archive — one clear next step */}
      {signedIn && !hasArchive ? (
        <section className="mx-auto max-w-3xl rounded-2xl border border-primary/30 bg-primary/[0.06] px-6 py-6 text-center">
          <h2 className="text-lg font-semibold tracking-tight">
            Your archive is empty — let&apos;s fix that
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add the first concert you remember. Search it, pick your night, and
            we&apos;ll attach the real setlist automatically.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/add/show">
                <CalendarDays />
                Add your first show
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/import">
                <Download />
                Import from setlist.fm
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

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
            {wall.map((poster, index) => (
              <Link
                key={poster.id}
                href={`/posters/${poster.id}`}
                className="group relative block h-56 shrink-0 snap-start overflow-hidden rounded-md border border-white/[0.06] sm:h-64 lg:h-72"
              >
                {/* First few are the homepage LCP — load them eagerly. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster.imageUrl}
                  alt={`${poster.artistName ?? "Concert poster"} — art by ${poster.designer}`}
                  loading={index < 4 ? "eager" : "lazy"}
                  fetchPriority={index < 2 ? "high" : "auto"}
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

      {/* ---- Browse the archive ---- */}
      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">
          Browse the archive
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {BROWSE.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium transition-colors hover:border-white/20 hover:bg-white/[0.03]"
            >
              <item.icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- Build your archive ---- (signed-in-empty is covered by the
           first-run callout up top, so only show this for archives-in-
           progress or signed-out visitors) */}
      {hasArchive || !signedIn ? (
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
      ) : null}
    </div>
  );
}
