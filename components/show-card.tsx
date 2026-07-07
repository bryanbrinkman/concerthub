import Link from "next/link";
import { CalendarDays, Heart, MapPin } from "lucide-react";

import type { Artist, Show, Tour, Venue } from "@/lib/types";
import { formatShortDate, formatShowDate, parseTicketStub } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PosterArt } from "@/components/gradient-art";
import { TicketArt } from "@/components/ticket-art";

interface ShowCardProps {
  show: Show;
  artist?: Artist;
  venue?: Venue;
  tour?: Tour;
  posterImage?: string;
  /** Ticket ephemera detail line — real seats print on the stub art. */
  ticketDetail?: string;
}

/** Poster-forward card linking to a show detail page. */
export function ShowCard({
  show,
  artist,
  venue,
  tour,
  posterImage,
  ticketDetail,
}: ShowCardProps) {
  const stub = parseTicketStub(ticketDetail);
  return (
    <Link
      href={`/shows/${show.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-white/20"
    >
      <div className="p-2.5 pb-0">
        {posterImage ? (
          <PosterArt
            gradient={show.gradient}
            imageUrl={posterImage}
            title={artist?.name ?? "Unknown artist"}
            className="transition-transform duration-300 group-hover:scale-[1.015]"
          />
        ) : (
          <TicketArt
            seedId={show.id}
            gradient={show.gradient}
            artist={artist?.name ?? "Unknown artist"}
            venue={venue?.name}
            cityLine={
              venue
                ? `${venue.city}${venue.region ? `, ${venue.region}` : ""}`
                : undefined
            }
            dateLine={formatShowDate(show.date)}
            timeLine={show.showTime}
            tourLine={tour?.name}
            sec={stub.sec}
            row={stub.row}
            seat={stub.seat}
            price={stub.price}
            className="transition-transform duration-300 group-hover:scale-[1.015]"
          />
        )}
      </div>
      <div className="space-y-1.5 p-3">
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
            <Badge variant="outline">Tracked</Badge>
          )}
          {tour ? <Badge variant="secondary">{tour.name}</Badge> : null}
        </div>
      </div>
    </Link>
  );
}
