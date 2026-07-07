import type { GradientKey } from "@/lib/types";
import { PosterArt } from "@/components/gradient-art";

interface PosterImageProps {
  /** Real artwork (seeded or pulled from Expresso Beans). */
  imageUrl?: string;
  gradient: GradientKey;
  title: string;
  subtitle?: string;
  footer?: string;
  className?: string;
}

/**
 * Poster visual with a real-image fast path. Thin wrapper kept as the
 * page-facing API; PosterArt handles the image-vs-placeholder rendering and
 * gradient fallback when an image fails to load.
 */
export function PosterImage(props: PosterImageProps) {
  return <PosterArt {...props} />;
}
