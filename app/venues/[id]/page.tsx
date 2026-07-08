import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Users } from "lucide-react";

import {
  ephemeraForShow,
  findArtist,
  findTour,
  findVenue,
  getArchive,
  showTitleFor,
  postersForShow,
  showsByVenue,
} from "@/lib/archive";
import { Badge } from "@/components/ui/badge";
import { GradientArt } from "@/components/gradient-art";
import { ShowCard } from "@/components/show-card";
import { JsonLd } from "@/components/json-ld";
import { PublicVenueView } from "@/components/public-venue-view";
import { getPublicVenue } from "@/lib/public";
import { breadcrumbJsonLd, locationLine, routeMetadata, venueJsonLd } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const venue = await getPublicVenue(id);
  if (!venue) return { title: "Venue" };
  const where = locationLine(venue.city, venue.region, venue.country);
  return routeMetadata({
    title: `${venue.name} Concert History & Posters | Concert Collect`,
    description: `Explore concert history and posters from ${venue.name}${where ? ` in ${where}` : ""} on Concert Collect.`,
    path: `/venues/${id}`,
  });
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archive = await getArchive();
  const venue = findVenue(archive, id);
  if (!venue) {
    const publicVenue = await getPublicVenue(id);
    if (!publicVenue) notFound();
    return <PublicVenueView venue={publicVenue} />;
  }

  const shows = showsByVenue(archive, venue.id);
  const attended = shows.filter((s) => s.attended);
  const showIds = new Set(shows.map((s) => s.id));
  const venuePosters = archive.posters
    .filter((p) => p.showId && showIds.has(p.showId) && p.imageUrl)
    .sort((a, b) => b.year - a.year);
  const posteredShowIds = new Set(
    archive.posters
      .filter((p) => p.showId && showIds.has(p.showId))
      .map((p) => p.showId as string),
  );
  const showsMissingPosters = shows.filter(
    (s) => !posteredShowIds.has(s.id),
  ).length;
  const artistCounts = new Map<string, number>();
  for (const s2 of shows) {
    artistCounts.set(s2.artistId, (artistCounts.get(s2.artistId) ?? 0) + 1);
  }
  const topArtists = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([artistId, count]) => ({
      artist: findArtist(archive, artistId),
      count,
    }));

  return (
    <div className="space-y-6">
      <JsonLd
        data={[
          venueJsonLd({
            name: venue.name,
            path: `/venues/${venue.id}`,
            city: venue.city,
            region: venue.region,
            country: venue.country,
          }),
          breadcrumbJsonLd([
            { name: "Venues", path: "/venues" },
            { name: venue.name, path: `/venues/${venue.id}` },
          ]),
        ]}
      />
      <Link
        href="/venues"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All venues
      </Link>

      <div className="flex items-center gap-5">
        <GradientArt
          gradient={venue.gradient}
          className="h-20 w-20 shrink-0 rounded-xl"
        >
          <div className="flex w-full items-center justify-center">
            <MapPin className="h-6 w-6 text-white/85" />
          </div>
        </GradientArt>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {venue.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {venue.city}
            {venue.region ? `, ${venue.region}` : ""}
            {venue.country ? ` · ${venue.country}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {venue.capacity ? (
              <Badge variant="secondary">
                <Users />
                Capacity {venue.capacity.toLocaleString("en-US")}
              </Badge>
            ) : null}
            <Badge>
              {attended.length} {attended.length === 1 ? "show" : "shows"}
            </Badge>
            {showsMissingPosters > 0 ? (
              <Badge
                variant="secondary"
                className="border-amber-500/30 text-amber-300"
              >
                {showsMissingPosters}{" "}
                {showsMissingPosters === 1 ? "show" : "shows"} missing posters
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {venuePosters.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Posters from this venue</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {venuePosters.map((poster) => (
              <Link key={poster.id} href={`/posters/${poster.id}`} className="group block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster.imageUrl as string}
                  alt={poster.title}
                  loading="lazy"
                  className="aspect-[3/4] w-full rounded-lg border border-white/10 bg-black/40 object-contain transition-transform group-hover:scale-[1.02]"
                />
                <p className="mt-1.5 truncate text-xs text-muted-foreground">
                  {poster.year} · {poster.designer}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {topArtists.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Top artists here</h2>
          <div className="flex flex-wrap gap-2">
            {topArtists.map(({ artist, count }) =>
              artist ? (
                <Link key={artist.id} href={`/artists/${artist.id}`}>
                  <Badge variant="secondary">
                    {artist.name} · {count}
                  </Badge>
                </Link>
              ) : null,
            )}
          </div>
        </section>
      ) : null}

      <h2 className="text-lg font-semibold">Show history</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shows.map((show) => (
          <ShowCard
            title={showTitleFor(archive, show)}
            key={show.id}
            show={show}
            artist={findArtist(archive, show.artistId)}
            venue={venue}
            tour={show.tourId ? findTour(archive, show.tourId) : undefined}
            posterImage={postersForShow(archive, show.id)[0]?.imageUrl}
            ticketDetail={
              ephemeraForShow(archive, show.id).find(
                (e) => e.kind === "ticket",
              )?.detail
            }
          />
        ))}
      </div>
    </div>
  );
}
