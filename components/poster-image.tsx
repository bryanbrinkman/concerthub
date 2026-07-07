import { cn } from "@/lib/utils";
import type { GradientKey } from "@/lib/types";
import { PosterArt } from "@/components/gradient-art";

interface PosterImageProps {
  /** Real artwork (e.g. pulled from Expresso Beans). Falls back to PosterArt. */
  imageUrl?: string;
  gradient: GradientKey;
  title: string;
  subtitle?: string;
  footer?: string;
  className?: string;
}

/**
 * Poster visual with a real-image fast path: renders the actual artwork when
 * a URL exists, otherwise the generated gradient poster. Both share the same
 * 3:4 footprint so layouts don't shift.
 */
export function PosterImage({
  imageUrl,
  gradient,
  title,
  subtitle,
  footer,
  className,
}: PosterImageProps) {
  if (imageUrl) {
    return (
      <div
        className={cn(
          "aspect-[3/4] overflow-hidden rounded-lg border border-border bg-secondary",
          className,
        )}
      >
        {/* Plain <img>: EB-hosted art shouldn't go through the Next image
            optimizer (hotlink protection can block its proxy fetches). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Poster: ${title}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <PosterArt
      gradient={gradient}
      title={title}
      subtitle={subtitle}
      footer={footer}
      className={className}
    />
  );
}
