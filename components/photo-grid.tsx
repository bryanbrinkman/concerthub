import { Camera } from "lucide-react";

import type { ShowPhoto } from "@/lib/data";
import { cn } from "@/lib/utils";
import { GradientArt } from "@/components/gradient-art";
import { EmptyState } from "@/components/empty-state";

interface PhotoGridProps {
  photos: ShowPhoto[];
  /** Cap the number shown (Overview tab shows a taste; Photos tab shows all). */
  limit?: number;
  className?: string;
}

/** "Photos from the night" — gradient placeholders until real uploads exist. */
export function PhotoGrid({ photos, limit, className }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        title="No photos yet"
        description="Add the blurry lasers, the marquee, the confetti — they all count."
        actionLabel="Upload photos"
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
          className={cn(
            "rounded-xl border border-border",
            // vary tile shapes a little, like a real photo dump
            i % 3 === 0 ? "aspect-[4/3]" : "aspect-[16/10]",
          )}
        >
          <div className="flex w-full flex-col justify-between p-3">
            <Camera className="h-4 w-4 text-white/70" />
            <p className="text-xs font-medium text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
              {photo.caption}
            </p>
          </div>
        </GradientArt>
      ))}
    </div>
  );
}
