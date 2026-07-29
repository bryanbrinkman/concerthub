"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Poster imagery with detail shots: cover image plus a thumbnail strip,
 * expanding into a lightbox with chevron/arrow-key navigation.
 */
export function PosterGallery({
  images,
  title,
  className,
}: {
  /** Cover first, then detail shots. */
  images: string[];
  title: string;
  className?: string;
}) {
  const [selected, setSelected] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const step = React.useCallback(
    (dir: 1 | -1) => {
      setSelected((current) => {
        const next = current + dir;
        if (next < 0 || next >= images.length) return current;
        return next;
      });
    },
    [images.length],
  );

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, step]);

  if (images.length === 0) return null;
  const current = images[Math.min(selected, images.length - 1)];

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Expand ${title} artwork`}
        className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-white/10"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={`Poster: ${title}`}
          fetchPriority="high"
          className="aspect-[3/4] w-full bg-black/40 object-contain"
        />
      </button>

      {images.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              aria-label={index === 0 ? "Cover" : `Detail shot ${index}`}
              onClick={() => setSelected(index)}
              className={cn(
                "cursor-pointer overflow-hidden rounded-md transition-all",
                index === selected
                  ? "ring-2 ring-primary"
                  : "opacity-60 ring-1 ring-border hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-14 w-11 bg-black/40 object-contain"
              />
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} artwork`}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 cursor-pointer rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {selected > 0 ? (
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}
          {selected < images.length - 1 ? (
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={`Poster: ${title}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />
          <div
            className="mt-3 flex items-center gap-3 text-sm text-white/80"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{title}</span>
            {images.length > 1 ? (
              <span className="text-xs text-white/50">
                {selected + 1} / {images.length}
                {selected === 0 ? " · cover" : " · detail"}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
