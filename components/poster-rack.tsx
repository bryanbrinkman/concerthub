"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderPlus,
} from "lucide-react";

import type { GradientKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PosterArt } from "@/components/gradient-art";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** Serializable poster data prepared server-side (see app/posters/page.tsx). */
export interface RackPoster {
  id: string;
  title: string;
  designer: string;
  year: number;
  gradient: GradientKey;
  imageUrl?: string;
  owned: boolean;
  editionSummary?: string;
  ebUrl: string;
  showHref?: string;
  showLabel?: string;
}

/** One dark slat of the rack — the flipped-past (or upcoming) posters. */
function Rib({
  side,
  offset,
  label,
  onClick,
}: {
  side: "left" | "right";
  offset: number;
  label: string;
  onClick: () => void;
}) {
  const angle = (side === "left" ? -1 : 1) * (2 + offset * 1.5);
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="h-44 w-2 shrink-0 cursor-pointer rounded-full border border-white/[0.06] bg-zinc-800 transition-colors hover:bg-zinc-600 sm:h-60"
      style={{ transform: `rotate(${angle}deg)` }}
    />
  );
}

/**
 * Poster flip-rack: fan through the collection like a record-store poster
 * bin. Arrows / spines / thumbnails / keyboard all navigate.
 */
export function PosterRack({ posters }: { posters: RackPoster[] }) {
  const [index, setIndex] = React.useState(0);
  const [dir, setDir] = React.useState<1 | -1>(1);
  const poster = posters[index];

  const go = React.useCallback(
    (next: number) => {
      if (next < 0 || next >= posters.length || next === index) return;
      setDir(next > index ? 1 : -1);
      setIndex(next);
    },
    [index, posters.length],
  );

  if (!poster) return null;

  const MAX_RIBS = 10;
  const leftRibs = posters.slice(Math.max(0, index - MAX_RIBS), index);
  const rightRibs = posters.slice(index + 1, index + 1 + MAX_RIBS);

  return (
    <div
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Poster collection"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      className="rounded-xl border border-border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* The rack */}
        <div className="min-w-0">
          <div className="flex items-center justify-center gap-1.5 py-2 [perspective:1400px]">
            <div className="flex items-center gap-1">
              {leftRibs.map((p, i) => (
                <Rib
                  key={p.id}
                  side="left"
                  offset={leftRibs.length - 1 - i}
                  label={`${p.title} (${p.year})`}
                  onClick={() => go(posters.indexOf(p))}
                />
              ))}
            </div>

            {/* Featured poster — keyed so the flip animation replays per turn */}
            <div
              key={poster.id}
              className={cn(
                "mx-2",
                dir === 1 ? "animate-fan-in-fwd" : "animate-fan-in-back",
              )}
            >
              <PosterArt
                gradient={poster.gradient}
                imageUrl={poster.imageUrl}
                title={poster.title}
                subtitle={poster.designer}
                footer={String(poster.year)}
                className="w-52 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.9)] sm:w-64 lg:w-72"
              />
            </div>

            <div className="flex items-center gap-1">
              {rightRibs.map((p, i) => (
                <Rib
                  key={p.id}
                  side="right"
                  offset={i}
                  label={`${p.title} (${p.year})`}
                  onClick={() => go(posters.indexOf(p))}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-3 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous poster"
              onClick={() => go(index - 1)}
              disabled={index === 0}
            >
              <ChevronLeft />
            </Button>
            <p className="text-xs tabular-nums text-muted-foreground">
              {index + 1} / {posters.length}
            </p>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next poster"
              onClick={() => go(index + 1)}
              disabled={index === posters.length - 1}
            >
              <ChevronRight />
            </Button>
          </div>

          {/* Thumbnail rail */}
          <div className="mt-4 flex justify-start gap-2 overflow-x-auto pb-1 scrollbar-none sm:justify-center">
            {posters.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Go to ${p.title}`}
                onClick={() => go(i)}
                className={cn(
                  "shrink-0 cursor-pointer overflow-hidden rounded-md transition-all",
                  i === index
                    ? "ring-2 ring-primary"
                    : "opacity-60 ring-1 ring-border hover:opacity-100",
                )}
              >
                <PosterArt
                  gradient={p.gradient}
                  imageUrl={p.imageUrl}
                  title={p.title}
                  className="w-12 rounded-md"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Metadata for the featured print */}
        <div className="flex flex-col justify-center gap-3">
          <div>
            <h2 className="text-lg font-semibold leading-tight">
              {poster.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {poster.designer} · {poster.year}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {poster.owned ? (
              <Badge variant="success">In collection</Badge>
            ) : (
              <Badge variant="outline">Wishlist</Badge>
            )}
            {poster.editionSummary ? (
              <Badge variant="secondary">{poster.editionSummary}</Badge>
            ) : null}
          </div>
          {poster.showHref && poster.showLabel ? (
            <Link
              href={poster.showHref}
              className="group flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {poster.showLabel}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" asChild>
              <a href={poster.ebUrl} target="_blank" rel="noreferrer">
                <ExternalLink />
                View on Expresso Beans
              </a>
            </Button>
            <Button variant="secondary" size="sm">
              <FolderPlus />
              Add to collection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
