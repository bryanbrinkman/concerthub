import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Download,
  Frame,
  Image as ImageIcon,
  MapPin,
  Search,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";

import { seedDemoAction } from "@/app/seed-actions";
import {
  allShows,
  archiveCounts,
  findArtist,
  findShow,
  findVenue,
  getArchive,
  postersForShow,
} from "@/lib/archive";
import { getExploreData } from "@/lib/explore";
import { locate } from "@/lib/geo";
import { formatShortDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PosterArt } from "@/components/gradient-art";
import { WorldMap } from "@/components/world-map";
import { MemoryCard } from "@/components/memory-card";
import { StateBadge } from "@/components/state-badge";
import { ShareButton } from "@/components/share-button";

function SectionHeading({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      {href ? (
        <Link
          href={href}
          className="text-sm text-primary transition-colors hover:text-primary/80"
        >
          {linkLabel ?? "View all"}
        </Link>
      ) : null}
    </div>
  );
}

export default async function ExplorePage() {
  const archive = await getArchive();
  const counts = archiveCounts(archive);
  const explore = await getExploreData();
  const myArtistIds = new Set(archive.artists.map((a) => a.id));
  const myVenueIds = new Set(archive.venues.map((v) => v.id));
  const myShowIds = new Set(archive.shows.map((s) => s.id));

  const latestMemory = [...archive.memories].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];
  const latestMemoryShow = latestMemory
    ? findShow(archive, latestMemory.showId)
    : undefined;

  // Personal wall fallback (also used when the public database is empty).
  const ownWall = allShows(archive)
    .flatMap((show) => {
      const poster = postersForShow(archive, show.id).find((p) => p.imageUrl);
      return poster ? [{ show, poster }] : [];
    })
    .slice(0, 10);

  // Map dots for the recently archived shows (offline city lookup).
  const recentMarkers = (explore?.recentShows ?? []).flatMap((show) => {
    const point = locate(show.venueCity, show.venueRegion, show.venueCountry);
    return point
      ? [
          {
            id: show.id,
            ...point,
            label: `${show.artistName} — ${show.venueCity || show.venueName}`,
          },
        ]
      : [];
  });

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="space-y-4 pt-2 text-center sm:pt-6">
        <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Every show. Everything it left behind.
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Explore concerts, collect posters, and help preserve the artifacts
          of live music history.
        </p>
        <form
          action="/shows"
          method="get"
          className="mx-auto flex max-w-xl gap-2"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="Search an artist, venue, show, poster, or poster artist…"
              className="h-10 w-full rounded-xl border border-border bg-secondary pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button type="submit" size="lg">
            Search
          </Button>
        </form>
      </section>

      {/* Featured Posters — image-dominant */}
      {(explore?.featured.length ?? 0) > 0 ? (
        <section>
          <SectionHeading title="Featured Posters" href="/prints" linkLabel="Trading Post" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {explore!.featured.map((poster) => (
              <Link
                key={poster.id}
                href={`/posters/${poster.id}`}
                className="group block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster.imageUrl}
                  alt={`${poster.artistName ?? "Poster"} — ${poster.designer}`}
                  loading="lazy"
                  className="aspect-[3/4] w-full rounded-lg border border-white/10 bg-black/40 object-contain shadow-[0_20px_45px_-20px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02]"
                />
                <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
                  <p className="truncate text-xs text-muted-foreground">
                    {poster.artistName ?? poster.designer} · {poster.year}
                  </p>
                  {poster.state !== "own" ? <StateBadge state={poster.state} /> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : ownWall.length > 0 ? (
        <section>
          <SectionHeading title="The poster wall" href="/posters" linkLabel="Fan the rack" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {ownWall.map(({ show, poster }) => (
              <Link key={show.id} href={`/shows/${show.id}`} className="group block">
                <PosterArt
                  gradient={show.gradient}
                  imageUrl={poster.imageUrl}
                  title={findArtist(archive, show.artistId)?.name ?? ""}
                  className="shadow-[0_20px_45px_-20px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <p className="mt-2 truncate px-0.5 text-xs text-muted-foreground">
                  {findArtist(archive, show.artistId)?.name} ·{" "}
                  {formatShortDate(show.date)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Recently Archived Shows — list beside a world map of their venues */}
      {(explore?.recentShows.length ?? 0) > 0 ? (
        <section>
          <SectionHeading title="Recently Archived Shows" href="/shows" linkLabel="Show Database" />
          <div className="grid items-center gap-6 rounded-xl border border-border bg-card p-4 sm:p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ol className="min-w-0 space-y-1">
              {explore!.recentShows.map((show) => {
                const href = myShowIds.has(show.id)
                  ? `/shows/${show.id}`
                  : show.posterId
                    ? `/posters/${show.posterId}`
                    : `/shows?q=${encodeURIComponent(show.artistName)}`;
                return (
                  <li key={show.id}>
                    <Link
                      href={href}
                      className="group flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium group-hover:text-primary">
                          {show.artistName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {show.venueName} · {show.venueCity} ·{" "}
                          {formatShortDate(show.date)}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {show.artifacts} artifact
                        {show.artifacts === 1 ? "" : "s"}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <WorldMap markers={recentMarkers} className="min-w-0" />
          </div>
        </section>
      ) : null}

      {/* Explore Posterographies */}
      {(explore?.posterographies.length ?? 0) > 0 ? (
        <section>
          <SectionHeading title="Explore Posterographies" href="/artists" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {explore!.posterographies.map((pg) => (
              <Link
                key={pg.artistId}
                href={
                  myArtistIds.has(pg.artistId)
                    ? `/artists/${pg.artistId}`
                    : `/shows?q=${encodeURIComponent(pg.artistName)}`
                }
                className="block"
              >
                <Card className="h-full transition-colors hover:border-white/20">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex gap-1.5">
                      {pg.thumbs.length > 0 ? (
                        pg.thumbs.map((thumb) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={thumb}
                            src={thumb}
                            alt=""
                            loading="lazy"
                            className="h-20 w-14 rounded-md border border-white/10 bg-black/40 object-contain"
                          />
                        ))
                      ) : (
                        <div className="flex h-20 w-14 items-center justify-center rounded-md border border-border bg-secondary">
                          <Frame className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="truncate font-medium">
                        {pg.artistName} Posterography
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pg.posterCount} poster{pg.posterCount === 1 ? "" : "s"} ·{" "}
                        {pg.years}
                      </p>
                      {pg.showsMissingPosters > 0 ? (
                        <p className="mt-1 text-[11px] text-amber-400/80">
                          {pg.showsMissingPosters} show
                          {pg.showsMissingPosters === 1 ? "" : "s"} missing
                          poster data
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-emerald-400/80">
                          Complete for known shows
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Iconic Venues */}
      {(explore?.venues.length ?? 0) > 0 ? (
        <section>
          <SectionHeading title="Iconic Venues" href="/venues" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {explore!.venues.map((venue) => (
              <Link
                key={venue.venueId}
                href={
                  myVenueIds.has(venue.venueId)
                    ? `/venues/${venue.venueId}`
                    : `/shows?q=${encodeURIComponent(venue.name)}`
                }
                className="block"
              >
                <Card className="h-full transition-colors hover:border-white/20">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{venue.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {venue.city} · {venue.showCount} show
                        {venue.showCount === 1 ? "" : "s"} · {venue.posterCount}{" "}
                        poster{venue.posterCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Missing from the Archive — the community game */}
      {explore ? (
        <section>
          <SectionHeading title="Missing from the Archive" />
          <p className="mb-4 -mt-2 text-sm text-muted-foreground">
            Help complete the record of live music history.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                count: explore.missing.showsMissingPosters,
                label: "shows missing posters",
                cta: "Add a poster",
                href: "/add/poster",
              },
              {
                count: explore.missing.postersMissingImages,
                label: "posters missing images",
                cta: "Upload an image",
                href: "/posters",
              },
              {
                count: explore.missing.postersMissingCredit,
                label: "posters missing artist credit",
                cta: "Credit a Poster Artist",
                href: "/posters",
              },
              {
                count: explore.missing.postersMissingEdition,
                label: "posters missing edition details",
                cta: "Fill in details",
                href: "/posters",
              },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="space-y-2 p-4">
                  <p className="text-2xl font-semibold tabular-nums">
                    {item.count}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={item.href}>{item.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---- Personal archive, below the world ---- */}
      <section className="border-t border-border pt-8">
        <SectionHeading
          title={archive.demo ? "Start your archive" : "My Archive"}
          href={archive.demo ? undefined : "/my-shows"}
          linkLabel="My Shows"
        />
        {archive.demo || archive.shows.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/import">
                <Download />
                Import from setlist.fm
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/add/show">
                <CalendarDays />
                Add a show by hand
              </Link>
            </Button>
            {!archive.demo ? (
              <form action={seedDemoAction}>
                <Button variant="outline" type="submit">
                  <Sparkles />
                  Copy the demo shows
                </Button>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Shows attended", value: counts.shows, icon: CalendarDays },
                { label: "Artists seen", value: archive.artists.length, icon: Users },
                { label: "Posters archived", value: counts.posters, icon: ImageIcon },
                { label: "Ticket stubs", value: counts.tickets, icon: Ticket },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold tabular-nums">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {archive.userId ? (
                <ShareButton path={`/u/${archive.userId}`} label="Share my archive" />
              ) : null}
              <Button variant="outline" asChild>
                <Link href="/my-shows">
                  My Shows
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            {latestMemory && latestMemoryShow ? (
              <div className="max-w-xl">
                <MemoryCard
                  memory={latestMemory}
                  title={`${findArtist(archive, latestMemoryShow.artistId)?.name ?? "Show"} · ${
                    findVenue(archive, latestMemoryShow.venueId)?.name ?? ""
                  }`}
                />
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
