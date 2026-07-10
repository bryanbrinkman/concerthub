"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";

import type { GradientKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PosterArt } from "@/components/gradient-art";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddToCollection, type CollectionOption } from "@/components/add-to-collection";

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
  showHref?: string;
  showLabel?: string;
  /** Link to the edit form (archive owner only). */
  editHref?: string;
}

/** Horizontal px between neighboring posters in the fan. */
const SPACING = 132;
/** Posters further than this from center are hidden (keeps paint cheap). */
const VISIBLE = 5;

/**
 * Poster coverflow: the whole collection fans through 3D space. Drag or
 * swipe to flip continuously, use the trackpad's horizontal scroll, click
 * a side poster to focus it, arrow keys / buttons to step. The center
 * poster links to its record.
 */
export function PosterRack({
  posters,
  collections,
}: {
  posters: RackPoster[];
  /** The viewer's collections — enables the add-to-collection picker. */
  collections?: CollectionOption[];
}) {
  const [index, setIndex] = React.useState(0);
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);

  const stageRef = React.useRef<HTMLDivElement>(null);
  const pointer = React.useRef<{ startX: number; moved: boolean } | null>(null);
  const wheelAcc = React.useRef(0);
  const thumbRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());

  const clampIndex = React.useCallback(
    (n: number) => Math.min(posters.length - 1, Math.max(0, n)),
    [posters.length],
  );
  const go = React.useCallback(
    (next: number) => setIndex(clampIndex(next)),
    [clampIndex],
  );

  // Keep a live ref for the native wheel listener.
  const goRef = React.useRef<(step: number) => void>(() => {});
  React.useEffect(() => {
    goRef.current = (step: number) => setIndex((i) => clampIndex(i + step));
  }, [clampIndex]);

  // Trackpad horizontal scroll flips the rack. Native listener so we can
  // preventDefault (React's wheel handler is passive); vertical scrolling
  // passes through untouched.
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      wheelAcc.current += e.deltaX;
      if (Math.abs(wheelAcc.current) > 60) {
        goRef.current(Math.sign(wheelAcc.current));
        wheelAcc.current = 0;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Center the active thumbnail in its rail.
  React.useEffect(() => {
    const active = posters[index] && thumbRefs.current.get(posters[index].id);
    active?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [index, posters]);

  const poster = posters[index];
  if (!poster) return null;

  // Continuous position while dragging; posters interpolate toward it.
  const virtual = index - dragX / SPACING;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointer.current = { startX: e.clientX, moved: false };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointer.current) return;
    const dx = e.clientX - pointer.current.startX;
    if (Math.abs(dx) > 5) pointer.current.moved = true;
    setDragX(dx);
  };
  // A drag that moved should not also fire the click on whatever poster
  // the pointer happened to be over when released.
  const suppressClick = React.useRef(false);
  const endDrag = () => {
    if (!pointer.current) return;
    go(Math.round(virtual));
    setDragX(0);
    setDragging(false);
    if (pointer.current.moved) suppressClick.current = true;
    pointer.current = null;
  };

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
        {/* The fan */}
        <div className="min-w-0">
          <div
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClickCapture={(e) => {
              if (suppressClick.current) {
                e.preventDefault();
                e.stopPropagation();
                suppressClick.current = false;
              }
            }}
            style={{ touchAction: "pan-y", perspective: "1200px" }}
            className={cn(
              "relative h-[300px] select-none overflow-hidden sm:h-[380px] lg:h-[420px]",
              dragging ? "cursor-grabbing" : "cursor-grab",
            )}
          >
            {posters.map((p, i) => {
              const rel = i - virtual;
              const abs = Math.abs(rel);
              if (abs > VISIBLE + 1) return null;
              const lean = Math.max(-1.1, Math.min(1.1, rel));
              const transform = [
                "translate(-50%, -50%)",
                `translateX(${rel * SPACING}px)`,
                `translateZ(${-abs * 110}px)`,
                `rotateY(${-lean * 38}deg)`,
              ].join(" ");
              const focused = Math.round(virtual) === i;
              const art = (
                <PosterArt
                  gradient={p.gradient}
                  imageUrl={p.imageUrl}
                  naturalAspect
                  title={p.title}
                  subtitle={p.designer}
                  footer={String(p.year)}
                  className={cn(
                    // Real art: bound by BOTH width and height so tall
                    // portraits scale down to fit the stage (max-h < stage h)
                    // instead of clipping. Placeholders keep a fixed width.
                    p.imageUrl
                      ? "max-h-[280px] max-w-[176px] sm:max-h-[356px] sm:max-w-[224px] lg:max-h-[396px] lg:max-w-[256px]"
                      : "w-44 sm:w-56 lg:w-64",
                    focused
                      ? "shadow-[0_30px_70px_-22px_rgba(0,0,0,0.95)]"
                      : "shadow-[0_16px_40px_-18px_rgba(0,0,0,0.8)]",
                  )}
                />
              );
              return (
                <div
                  key={p.id}
                  style={{
                    transform,
                    zIndex: 100 - Math.round(abs * 10),
                    opacity: abs > VISIBLE ? 0 : 1 - abs * 0.14,
                    filter: `brightness(${1 - Math.min(abs * 0.16, 0.55)})`,
                    transition: dragging
                      ? "none"
                      : "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease, filter 0.45s ease",
                    transformStyle: "preserve-3d",
                  }}
                  className="absolute left-1/2 top-1/2"
                >
                  {focused ? (
                    <Link
                      href={`/posters/${p.id}`}
                      draggable={false}
                      aria-label={`Open poster record: ${p.title}`}
                      className="block"
                    >
                      {art}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Focus ${p.title} (${p.year})`}
                      onClick={() => go(i)}
                      className="block cursor-pointer"
                    >
                      {art}
                    </button>
                  )}
                </div>
              );
            })}
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
          <div className="mt-4 flex justify-start gap-2 overflow-x-auto pb-1 scrollbar-none">
            {posters.map((p, i) => (
              <button
                key={p.id}
                ref={(el) => {
                  if (el) thumbRefs.current.set(p.id, el);
                  else thumbRefs.current.delete(p.id);
                }}
                type="button"
                aria-label={`Go to ${p.title}`}
                onClick={() => go(i)}
                className={cn(
                  "shrink-0 cursor-pointer overflow-hidden rounded-md transition-all duration-300",
                  i === index
                    ? "scale-105 ring-2 ring-primary"
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

        {/* Metadata for the featured print — re-animates per poster */}
        <div key={poster.id} className="animate-fade-up flex flex-col justify-center gap-3">
          <div>
            <Link
              href={`/posters/${poster.id}`}
              className="text-lg font-semibold leading-tight hover:text-primary"
            >
              {poster.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              Poster art by {poster.designer} · {poster.year}
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
            {collections ? (
              <AddToCollection
                posterId={poster.id}
                collections={collections}
                size="sm"
              />
            ) : null}
            {poster.editHref ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href={poster.editHref}>
                  <Pencil />
                  Edit
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
