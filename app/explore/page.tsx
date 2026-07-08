import Link from "next/link";
import { Compass, Frame, MapPin } from "lucide-react";

import { getArchive } from "@/lib/archive";
import { getExploreData } from "@/lib/explore";
import { locate } from "@/lib/geo";
import { formatShortDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { WorldMap } from "@/components/world-map";

export const metadata = { title: "Explore" };

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

/**
 * The database-health view of the shared archive: posterographies,
 * venues, the show map, and what's still missing. Moved off the
 * homepage so that stays editorial.
 */
export default async function ExplorePage() {
  const archive = await getArchive();
  const explore = await getExploreData();
  const myArtistIds = new Set(archive.artists.map((a) => a.id));
  const myVenueIds = new Set(archive.venues.map((v) => v.id));
  const myShowIds = new Set(archive.shows.map((s) => s.id));

  if (!explore) {
    return (
      <EmptyState
        icon={Compass}
        title="The public archive is warming up"
        description="Explore lights up once the shared database is reachable and has shows in it."
      />
    );
  }

  const recentMarkers = explore.recentShows.flatMap((show) => {
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
      <PageHeader
        title="Explore"
        subtitle="The state of the shared archive — who's documented, where it happened, and what's still missing."
      />

      {/* Recently archived, on the map */}
      {explore.recentShows.length > 0 ? (
        <section>
          <SectionHeading title="Latest Additions" href="/shows" linkLabel="Show Database" />
          <div className="grid items-center gap-6 rounded-xl border border-border bg-card p-4 sm:p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ol className="min-w-0 space-y-1">
              {explore.recentShows.map((show) => {
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

      {/* Posterographies */}
      {explore.posterographies.length > 0 ? (
        <section>
          <SectionHeading title="Explore Posterographies" href="/artists" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {explore.posterographies.map((pg) => (
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

      {/* Iconic venues */}
      {explore.venues.length > 0 ? (
        <section>
          <SectionHeading title="Iconic Venues" href="/venues" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {explore.venues.map((venue) => (
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

      {/* Missing from the archive — the community contribution game */}
      <section>
        <SectionHeading title="Missing from the Archive" />
        <p className="-mt-2 mb-4 text-sm text-muted-foreground">
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
              href: "/my-posters",
            },
            {
              count: explore.missing.postersMissingCredit,
              label: "posters missing artist credit",
              cta: "Credit a Poster Artist",
              href: "/my-posters",
            },
            {
              count: explore.missing.postersMissingEdition,
              label: "posters missing edition details",
              cta: "Fill in details",
              href: "/my-posters",
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
    </div>
  );
}
