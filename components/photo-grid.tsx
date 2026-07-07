"use client";

import * as React from "react";
import { Camera, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";

import type { ShowPhoto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deletePhotoAction } from "@/app/manage-actions";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";

interface PhotoGridProps {
  photos: ShowPhoto[];
  /** Cap the number shown (Overview tab shows a taste; Photos tab shows all). */
  limit?: number;
  /** Link to the add-photo form; when unset the CTA is decorative. */
  addHref?: string;
  /** Viewer owns this archive — show delete controls. */
  canEdit?: boolean;
  className?: string;
}

/**
 * "Photos from the night". Tiles with real images expand into a lightbox
 * (click, then arrow keys / chevrons to move between them, Esc to close).
 */
export function PhotoGrid({
  photos,
  limit,
  addHref,
  canEdit,
  className,
}: PhotoGridProps) {
  const visible = limit ? photos.slice(0, limit) : photos;
  const [lightbox, setLightbox] = React.useState<number | null>(null);

  const close = React.useCallback(() => setLightbox(null), []);
  const step = React.useCallback(
    (dir: 1 | -1) => {
      setLightbox((current) => {
        if (current === null) return current;
        const next = current + dir;
        if (next < 0 || next >= visible.length) return current;
        return next;
      });
    },
    [visible.length],
  );

  React.useEffect(() => {
    if (lightbox === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox, close, step]);

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        title="No photos yet"
        description="Add the blurry lasers, the marquee, the confetti — they all count."
        actionLabel="Upload photos"
        actionHref={addHref}
        className={className}
      />
    );
  }

  const current = lightbox !== null ? visible[lightbox] : null;

  return (
    <>
      <div className={cn("grid grid-cols-2 gap-3", className)}>
        {visible.map((photo, i) => (
          <GradientArt
            key={photo.id}
            gradient={photo.gradient}
            imageUrl={photo.imageUrl}
            imageAlt={photo.caption}
            onClick={photo.imageUrl ? () => setLightbox(i) : undefined}
            className={cn(
              "group rounded-lg border border-border",
              photo.imageUrl ? "cursor-zoom-in" : "",
              // vary tile shapes a little, like a real photo dump
              i % 3 === 0 ? "aspect-[4/3]" : "aspect-[16/10]",
            )}
          >
            <div className="flex w-full flex-col justify-between p-2.5">
              <div className="flex items-start justify-between">
                {photo.imageUrl ? (
                  <span />
                ) : (
                  <Camera className="h-4 w-4 text-white/70" />
                )}
                {canEdit ? (
                  <form
                    action={deletePhotoAction}
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <input type="hidden" name="id" value={photo.id} />
                    <button
                      type="submit"
                      aria-label="Delete photo"
                      title="Delete"
                      className="cursor-pointer rounded-full bg-black/60 p-1.5 text-white/80 transition-colors hover:bg-black/80 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                ) : null}
              </div>
              <p className="w-fit rounded bg-black/45 px-1.5 py-0.5 text-[11px] font-medium text-white/90">
                {photo.caption}
              </p>
            </div>
          </GradientArt>
        ))}
      </div>

      {/* Lightbox */}
      {current?.imageUrl ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={current.caption || "Photo"}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute right-4 top-4 cursor-pointer rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {lightbox !== null && lightbox > 0 ? (
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}
          {lightbox !== null && lightbox < visible.length - 1 ? (
            <button
              type="button"
              aria-label="Next photo"
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
            src={current.imageUrl}
            alt={current.caption || "Concert photo"}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />
          <div
            className="mt-3 flex items-center gap-3 text-sm text-white/80"
            onClick={(e) => e.stopPropagation()}
          >
            {current.caption ? <span>{current.caption}</span> : null}
            <span className="text-xs text-white/50">
              {(lightbox ?? 0) + 1} / {visible.length}
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}
