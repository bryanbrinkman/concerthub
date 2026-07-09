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
import { formatDateRange, formatShowDate, parseTicketStub } from "@/lib/utils";
import { toggleAttendedAction } from "@/app/show-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  /** All poster records on this show — variants render as a small rail. */
  posterVariants?: Array<{ id: string; imageUrl?: string; title: string }>;
  /** Ticket ephemera detail — real seats print on the stub art. */
  ticketDetail?: string;
  /**
   * Display title for the event — "Radiohead", "The Postal Service +
   * Death Cab for Cutie", "Governors Ball 2014". Falls back to the
   * primary artist's name.
   */
  displayTitle?: string;
  /** Support acts on the bill, in billing order ("With …" line). */
  openers?: Artist[];
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
  posterVariants = [],
  ticketDetail,
  displayTitle,
  openers = [],
  canEdit,
}: ShowHeroProps) {
  const stub = parseTicketStub(ticketDetail);
  const title = displayTitle ?? artist?.name ?? "Unknown artist";
  const dateLabel = show.endDate
    ? formatDateRange(show.date, show.endDate)
    : formatShowDate(show.date);
  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative grid gap-5 p-4 sm:p-5 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_350px]">
        {/* Poster — pinned top-left; ticket-stub art when no print exists */}
        {poster?.resolvedImageUrl ? (
          <div className="mx-auto w-full max-w-[250px] space-y-2 self-start lg:mx-0">
            {/* Natural aspect — the real poster, no fixed 3:4 letterbox. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster.resolvedImageUrl}
              alt={`Poster: ${artist?.name ?? "Unknown artist"}`}
              className="w-full rounded-lg border border-white/10 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)]"
            />
            {posterVariants.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {posterVariants.map((variant) => (
                  <Link
                    key={variant.id}
                    href={`/posters/${variant.id}`}
                    title={variant.title}
                    className="block overflow-hidden rounded-md opacity-70 ring-1 ring-border transition-opacity hover:opacity-100"
                  >
                    {variant.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={variant.imageUrl}
                        alt={variant.title}
                        loading="lazy"
                        className="h-14 w-11 bg-black/40 object-contain"
                      />
                    ) : (
                      <span className="flex h-14 w-11 items-center justify-center bg-secondary font-mono text-[8px] uppercase text-muted-foreground">
                        {variant.title.slice(0, 6)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[250px] space-y-2 self-start lg:mx-0">
            <TicketArt
              seedId={show.id}
            gradient={show.gradient}
            artist={title}
            venue={venue?.name}
            cityLine={
              venue
                ? `${venue.city}${venue.region ? `, ${venue.region}` : ""}${venue.country ? `, ${venue.country}` : ""}`
                : undefined
            }
            dateLine={dateLabel}
            timeLine={show.showTime}
            tourLine={tour?.name}
              sec={stub.sec}
              row={stub.row}
              seat={stub.seat}
              price={stub.price}
              className="shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)]"
            />
            <p className="text-center text-xs text-muted-foreground lg:text-left">
              Know of a poster from this show?{" "}
              <Link
                href={`/add/poster?show=${show.id}`}
                className="text-primary hover:underline"
              >
                Add it →
              </Link>
            </p>
          </div>
        )}

        {/* Title + meta + CTAs — top-aligned with the poster, even when the
            setlist column is much taller */}
        <div className="flex flex-col items-start justify-start gap-4 self-start py-1">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h1>
            </div>
            {tour ? (
              <p className="mt-1 flex items-center gap-1.5 text-lg text-muted-foreground">
                {tour.name}
                <BadgeCheck className="h-4 w-4 text-primary" />
              </p>
            ) : null}
            {openers.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                With{" "}
                {openers.map((opener, index) => (
                  <span key={opener.id}>
                    {index > 0 ? ", " : ""}
                    <Link
                      href={`/artists/${opener.id}`}
                      className="text-foreground/90 transition-colors hover:text-primary"
                    >
                      {opener.name}
                    </Link>
                  </span>
                ))}
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
                <span className="font-medium">{dateLabel}</span>
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
