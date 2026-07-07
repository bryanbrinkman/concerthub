import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Users } from "lucide-react";

import {
  ephemeraForShow,
  findArtist,
  findTour,
  findVenue,
  getArchive,
  postersForShow,
  showsByVenue,
} from "@/lib/archive";
import { Badge } from "@/components/ui/badge";
import { GradientArt } from "@/components/gradient-art";
import { ShowCard } from "@/components/show-card";

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archive = await getArchive();
  const venue = findVenue(archive, id);
  if (!venue) notFound();

  const shows = showsByVenue(archive, venue.id);
  const attended = shows.filter((s) => s.attended);

  return (
    <div className="space-y-6">
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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shows.map((show) => (
          <ShowCard
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
