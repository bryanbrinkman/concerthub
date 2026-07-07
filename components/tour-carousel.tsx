"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Show } from "@/lib/types";
import { getArtist, getPostersForShow, getVenue } from "@/lib/data";
import { cn, formatShortDate } from "@/lib/utils";
import { GradientArt } from "@/components/gradient-art";

interface TourCarouselProps {
  shows: Show[];
  currentShowId: string;
  title?: string;
}

/** "More from this tour" — horizontally scrollable sibling shows. */
export function TourCarousel({
  shows,
  currentShowId,
  title = "More from this tour",
}: TourCarouselProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  if (shows.length <= 1) return null;

  const scrollByAmount = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByAmount(-1)}
            className="cursor-pointer rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByAmount(1)}
            className="cursor-pointer rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
      >
        {shows.map((show) => {
          const venue = getVenue(show.venueId);
          const artist = getArtist(show.artistId);
          const posterImage = getPostersForShow(show.id)[0]?.imageUrl;
          const current = show.id === currentShowId;
          return (
            <Link
              key={show.id}
              href={`/shows/${show.id}`}
              className={cn(
                "flex w-56 shrink-0 items-center gap-3 rounded-lg border bg-secondary/40 p-2 transition-colors",
                current
                  ? "border-primary/60 ring-1 ring-primary/40"
                  : "border-border hover:border-white/20",
              )}
            >
              <GradientArt
                gradient={show.gradient}
                imageUrl={posterImage}
                imageAlt={artist ? `${artist.name} poster` : "Show poster"}
                className="aspect-[3/4] w-11 shrink-0 rounded-md"
              >
                {posterImage ? null : (
                  <div className="flex w-full items-end justify-center pb-1">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-white/80">
                      {artist?.name.slice(0, 4)}
                    </span>
                  </div>
                )}
              </GradientArt>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {formatShortDate(show.date)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {venue ? `${venue.city}${venue.region ? `, ${venue.region}` : ""}` : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {venue?.name}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
