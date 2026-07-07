import { Camera, Trash2 } from "lucide-react";

import type { ShowPhoto } from "@/lib/data";
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

/** "Photos from the night" — gradient placeholders until real uploads exist. */
export function PhotoGrid({
  photos,
  limit,
  addHref,
  canEdit,
  className,
}: PhotoGridProps) {
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

  const visible = limit ? photos.slice(0, limit) : photos;

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {visible.map((photo, i) => (
        <GradientArt
          key={photo.id}
          gradient={photo.gradient}
          imageUrl={photo.imageUrl}
          imageAlt={photo.caption}
          className={cn(
            "group rounded-lg border border-border",
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
  );
}
