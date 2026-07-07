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
