import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin } from "lucide-react";

import {
  ephemeraForShow,
  findArtist,
  findTour,
  findVenue,
  getArchive,
  postersForShow,
  showsByArtist,
} from "@/lib/archive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradientArt } from "@/components/gradient-art";
import { ShowCard } from "@/components/show-card";

export default async function ArtistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archive = await getArchive();
  const artist = findArtist(archive, id);
  if (!artist) notFound();

  const shows = showsByArtist(archive, artist.id);
  const attended = shows.filter((s) => s.attended);
  const showIds = new Set(shows.map((s) => s.id));
  const posterography = archive.posters
    .filter((p) => p.showId && showIds.has(p.showId))
    .sort((a, b) => b.year - a.year);
  const posteredShowIds = new Set(
    posterography.map((p) => p.showId as string),
  );
  const showsMissingPosters = shows.filter(
    (s) => !posteredShowIds.has(s.id),
  ).length;

  return (
    <div className="space-y-6">
      <Link
        href="/artists"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All artists
      </Link>

      <div className="flex items-center gap-5">
        <GradientArt
          gradient={artist.gradient}
          className="h-20 w-20 shrink-0 rounded-full"
        >
          <div className="flex w-full items-center justify-center">
            <span className="text-2xl font-bold text-white/90">
              {artist.name.charAt(0)}
            </span>
          </div>
        </GradientArt>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {artist.name}
          </h1>
          {artist.hometown ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {artist.hometown}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {artist.genres.map((genre) => (
              <Badge key={genre} variant="secondary">
                {genre}
              </Badge>
            ))}
            <Badge>
              Seen {attended.length} {attended.length === 1 ? "time" : "times"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Posterography — the visual record of this band's shows */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Posterography</h2>
            {posterography.length > 0 ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {showsMissingPosters > 0 ? (
                  <span className="text-amber-400">
                    {showsMissingPosters}{" "}
                    {showsMissingPosters === 1 ? "show is" : "shows are"}{" "}
                    missing poster data — know of one?
                  </span>
                ) : (
                  <span className="text-emerald-400">
                    Complete for all known shows
                  </span>
                )}
              </p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/add/poster">Add a poster</Link>
          </Button>
        </div>
        {posterography.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No posters cataloged for {artist.name} yet — know of one?{" "}
            <Link href="/add/poster" className="text-primary hover:underline">
              Add it →
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {posterography.map((poster) => (
              <Link
                key={poster.id}
                href={`/posters/${poster.id}`}
                className="group block"
              >
                {poster.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poster.imageUrl}
                    alt={poster.title}
                    loading="lazy"
                    className="aspect-[3/4] w-full rounded-lg border border-white/10 object-cover transition-transform group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-secondary p-2 text-center font-mono text-[10px] uppercase text-muted-foreground">
                    {poster.title}
                  </div>
                )}
                <p className="mt-1.5 truncate text-xs text-muted-foreground">
                  {poster.year} · {poster.designer}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <h2 className="text-lg font-semibold">Show history</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shows.map((show) => (
          <ShowCard
            key={show.id}
            show={show}
            artist={artist}
            venue={findVenue(archive, show.venueId)}
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
