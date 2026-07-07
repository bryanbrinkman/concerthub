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
import { formatShowDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PosterImage } from "@/components/poster-image";
import { SetlistCard } from "@/components/setlist-card";

interface ShowHeroProps {
  show: Show;
  artist?: Artist;
  venue?: Venue;
  tour?: Tour;
  setlist?: Setlist;
  /** The show's poster, if cataloged — real EB artwork renders when available. */
  poster?: EnrichedPoster;
}

/** Hero band: poster, title block, meta, CTAs, and (on wide screens) the setlist. */
export function ShowHero({ show, artist, venue, tour, setlist, poster }: ShowHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* soft purple wash behind the hero */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_0%_0%,rgba(139,92,246,0.14),transparent_55%)]" />

      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_360px]">
        {/* Poster */}
        <PosterImage
          imageUrl={poster?.resolvedImageUrl}
          gradient={show.gradient}
          title={artist?.name ?? "Unknown artist"}
          subtitle={tour?.name}
          footer={
            venue
              ? `${venue.name} · ${formatShowDate(show.date)}`
              : formatShowDate(show.date)
          }
          className="mx-auto w-full max-w-[260px] shadow-[0_20px_50px_-20px_rgba(139,92,246,0.45)] lg:mx-0"
        />

        {/* Title + meta + CTAs */}
        <div className="flex flex-col justify-center gap-4 py-1">
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
                  {["from-violet-500 to-fuchsia-500", "from-cyan-500 to-blue-600", "from-amber-500 to-rose-500"].map(
                    (g) => (
                      <div
                        key={g}
                        className={`h-7 w-7 rounded-full border-2 border-card bg-gradient-to-br ${g}`}
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
              <Button>
                <BadgeCheck />
                I was there
              </Button>
            ) : null}
            <Button variant={show.attended ? "default" : "secondary"}>
              <NotebookPen />
              Add memory
            </Button>
            <Button variant="secondary">
              <FolderPlus />
              Add to collection
            </Button>
            <Button variant="outline">
              <Upload />
              Upload ephemera
            </Button>
          </div>
        </div>

        {/* Setlist preview — only at xl; smaller screens use the Setlist tab */}
        <div className="hidden xl:block">
          <SetlistCard setlist={setlist} variant="preview" className="h-full" />
        </div>
      </div>
    </section>
  );
}
