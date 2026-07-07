import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  FolderPlus,
  MapPin,
  NotebookPen,
  Upload,
} from "lucide-react";

import type { Artist, Setlist, Show, Tour, Venue } from "@/lib/types";
import type { EnrichedPoster } from "@/lib/expressobeans";
import { formatShowDate, parseTicketStub } from "@/lib/utils";
import { toggleAttendedAction } from "@/app/show-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PosterImage } from "@/components/poster-image";
import { TicketArt } from "@/components/ticket-art";
import { SetlistCard } from "@/components/setlist-card";

interface ShowHeroProps {
  show: Show;
  artist?: Artist;
  venue?: Venue;
  tour?: Tour;
  setlist?: Setlist;
  /** The show's poster, if cataloged — real EB artwork renders when available. */
  poster?: EnrichedPoster;
  /** Ticket ephemera detail — real seats print on the stub art. */
  ticketDetail?: string;
  /** Viewer owns this archive: "I was there" becomes a real toggle. */
  canEdit?: boolean;
}

/** Hero band: poster, title block, meta, CTAs, and (on wide screens) the setlist. */
export function ShowHero({
  show,
  artist,
  venue,
  tour,
  setlist,
  poster,
  ticketDetail,
  canEdit,
}: ShowHeroProps) {
  const stub = parseTicketStub(ticketDetail);
  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative grid gap-5 p-4 sm:p-5 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_350px]">
        {/* Poster — pinned top-left; ticket-stub art when no print exists */}
        {poster?.resolvedImageUrl ? (
          <PosterImage
            imageUrl={poster.resolvedImageUrl}
            gradient={show.gradient}
            title={artist?.name ?? "Unknown artist"}
            className="mx-auto w-full max-w-[250px] self-start shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)] lg:mx-0"
          />
        ) : (
          <TicketArt
            seedId={show.id}
            gradient={show.gradient}
            artist={artist?.name ?? "Unknown artist"}
            venue={venue?.name}
            cityLine={
              venue
                ? `${venue.city}${venue.region ? `, ${venue.region}` : ""}${venue.country ? `, ${venue.country}` : ""}`
                : undefined
            }
            dateLine={formatShowDate(show.date)}
            timeLine={show.showTime}
            tourLine={tour?.name}
            sec={stub.sec}
            row={stub.row}
            seat={stub.seat}
            price={stub.price}
            className="mx-auto w-full max-w-[250px] self-start shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)] lg:mx-0"
          />
        )}

        {/* Title + meta + CTAs — top-aligned with the poster, even when the
            setlist column is much taller */}
        <div className="flex flex-col items-start justify-start gap-4 self-start py-1">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {artist?.name ?? "Unknown artist"}
              </h1>
            </div>
            {tour ? (
              <p className="mt-1 flex items-center gap-1.5 text-lg text-muted-foreground">
                {tour.name}
                <BadgeCheck className="h-4 w-4 text-primary" />
              </p>
            ) : null}
          </div>

          <div className="space-y-2 text-sm">
            {venue ? (
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="font-medium">{venue.name}</span>
                  <br />
                  <span className="text-muted-foreground">
                    {venue.city}
                    {venue.region ? `, ${venue.region}` : ""}, {venue.country}
                  </span>
                </span>
              </p>
            ) : null}
            <p className="flex items-start gap-2.5">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">{formatShowDate(show.date)}</span>
                {show.showTime ? (
                  <>
                    <br />
                    <span className="text-muted-foreground">{show.showTime}</span>
                  </>
                ) : null}
              </span>
            </p>
          </div>

          {/* Attendance */}
          <div className="flex flex-wrap items-center gap-3">
            {show.attended ? (
              <>
                <div className="flex -space-x-2">
                  {["from-zinc-500 to-zinc-700", "from-stone-500 to-stone-700", "from-slate-500 to-slate-700"].map(
                    (g) => (
                      <div
                        key={g}
                        className={`h-6 w-6 rounded-full border-2 border-card bg-gradient-to-br ${g}`}
                      />
                    ),
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  You{show.attendeeCount ? ` and ${show.attendeeCount} others` : ""}{" "}
                  were there
                </p>
              </>
            ) : (
              <Badge variant="outline">Not marked as attended</Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {!show.attended ? (
              canEdit ? (
                <form action={toggleAttendedAction}>
                  <input type="hidden" name="showId" value={show.id} />
                  <Button type="submit">
                    <BadgeCheck />
                    I was there
                  </Button>
                </form>
              ) : (
                <Button>
                  <BadgeCheck />
                  I was there
                </Button>
              )
            ) : null}
            <Button variant={show.attended ? "default" : "secondary"}>
              <NotebookPen />
              Add memory
            </Button>
            <Button variant="secondary">
              <FolderPlus />
              Add to collection
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/add/ephemera?show=${show.id}`}>
                <Upload />
                Upload ephemera
              </Link>
            </Button>
          </div>
        </div>

        {/* Setlist preview — only at xl; smaller screens use the Setlist tab */}
        <div className="hidden xl:block">
          <SetlistCard
            setlist={setlist}
            artistName={artist?.name}
            variant="preview"
            className="h-full"
          />
        </div>
      </div>
    </section>
  );
}
