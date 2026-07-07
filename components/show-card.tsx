import Link from "next/link";
import { CalendarDays, Heart, MapPin } from "lucide-react";

import type { Show } from "@/lib/types";
import { getArtist, getTour, getVenue } from "@/lib/data";
import { formatShortDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PosterArt } from "@/components/gradient-art";

/** Poster-forward card linking to a show detail page. */
export function ShowCard({ show }: { show: Show }) {
  const artist = getArtist(show.artistId);
  const venue = getVenue(show.venueId);
  const tour = show.tourId ? getTour(show.tourId) : undefined;

  return (
    <Link
      href={`/shows/${show.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40"
    >
      <div className="p-3 pb-0">
        <PosterArt
          gradient={show.gradient}
          title={artist?.name ?? "Unknown artist"}
          subtitle={tour?.name}
          footer={
            venue ? `${venue.city}${venue.region ? `, ${venue.region}` : ""}` : undefined
          }
          className="transition-transform duration-300 group-hover:scale-[1.015]"
        />
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium leading-tight">
            {artist?.name ?? "Unknown artist"}
          </p>
          {show.favorite ? (
            <Heart className="h-4 w-4 shrink-0 fill-primary text-primary" />
          ) : null}
        </div>
        {venue ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {venue.name} · {venue.city}
              {venue.region ? `, ${venue.region}` : ""}
            </span>
          </p>
        ) : null}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3 shrink-0" />
          {formatShortDate(show.date)}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {show.attended ? (
            <Badge variant="success">I was there</Badge>
          ) : (
            <Badge variant="outline">On the tour</Badge>
          )}
          {tour ? <Badge variant="secondary">{tour.name}</Badge> : null}
        </div>
      </div>
    </Link>
  );
}
