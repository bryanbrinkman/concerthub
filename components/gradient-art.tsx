import * as React from "react";

import { cn } from "@/lib/utils";
import type { GradientKey } from "@/lib/types";

/**
 * Placeholder artwork.
 *
 * Visuals are muted duotone gradients (mono-dark, letting photos carry the
 * color). When an `imageUrl` is provided it renders as a CSS background layer
 * ABOVE the gradient — if the image ever fails to load, the gradient shows
 * through instead of a broken-image icon.
 */
const GRADIENTS: Record<GradientKey, string> = {
  aurora: "from-zinc-800 via-purple-950 to-zinc-950",
  dusk: "from-zinc-800 via-indigo-950 to-black",
  ember: "from-stone-800 via-rose-950 to-zinc-950",
  ocean: "from-slate-800 via-blue-950 to-zinc-950",
  jade: "from-zinc-800 via-emerald-950 to-zinc-950",
  gold: "from-stone-800 via-amber-950 to-zinc-950",
  midnight: "from-zinc-800 via-zinc-900 to-black",
  neon: "from-zinc-800 via-fuchsia-950 to-zinc-950",
};

interface GradientArtProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient: GradientKey;
  /** Real photo layered over the gradient (mock imagery for now). */
  imageUrl?: string;
  /** Accessible description when imageUrl is set. */
  imageAlt?: string;
  /**
   * How the image fills the frame: "cover" crops to fill (photos),
   * "contain" letterboxes so the full image is visible (poster art —
   * never crop a print).
   */
  fit?: "cover" | "contain";
}

export function GradientArt({
  gradient,
  imageUrl,
  imageAlt,
  fit = "cover",
  className,
  children,
  ...props
}: GradientArtProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br",
        GRADIENTS[gradient],
        className,
      )}
      {...(imageUrl ? { role: "img", "aria-label": imageAlt } : {})}
      {...props}
    >
      {imageUrl ? (
        <div
          className={cn(
            "absolute inset-0 bg-center bg-no-repeat",
            fit === "contain" ? "bg-contain" : "bg-cover",
          )}
          style={{ backgroundImage: `url("${imageUrl}")` }}
        />
      ) : null}
      {/* soft light + vignette so flat surfaces read as printed/photographed */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(255,255,255,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_100%_at_85%_110%,rgba(0,0,0,0.45),transparent_60%)]" />
      {children != null && (
        <div className="relative flex h-full w-full">{children}</div>
      )}
    </div>
  );
}

interface PosterArtProps {
  gradient: GradientKey;
  title: string;
  subtitle?: string;
  footer?: string;
  /** Real poster artwork — replaces the typographic placeholder entirely. */
  imageUrl?: string;
  /**
   * Render real art at its true aspect ratio (width-constrained, height
   * auto) instead of letterboxing it into a fixed 3/4 portrait frame — so
   * a landscape poster shows wide and a tall poster shows tall. Grids that
   * need uniform tiles leave this off.
   */
  naturalAspect?: boolean;
  className?: string;
}

/** A gig-poster-styled visual: real art when available, typographic otherwise. */
export function PosterArt({
  gradient,
  title,
  subtitle,
  footer,
  imageUrl,
  naturalAspect,
  className,
}: PosterArtProps) {
  // True aspect ratio — the whole print, never cropped, never letterboxed.
  // width/height auto + caller-supplied max-w/max-h let the image scale down
  // to fit its bounding box (so tall portraits aren't clipped).
  if (imageUrl && naturalAspect) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={`Poster: ${title}`}
        draggable={false}
        className={cn(
          "block h-auto w-auto rounded-lg border border-white/10",
          className,
        )}
      />
    );
  }
  if (imageUrl) {
    return (
      <GradientArt
        gradient={gradient}
        imageUrl={imageUrl}
        imageAlt={`Poster: ${title}`}
        fit="contain"
        className={cn("aspect-[3/4] rounded-lg border border-white/10", className)}
      />
    );
  }
  return (
    <GradientArt
      gradient={gradient}
      className={cn("@container aspect-[3/4] rounded-lg", className)}
    >
      <div className="flex w-full flex-col items-center justify-between p-[8%] text-center">
        <div className="w-full border border-white/25 px-2 py-[6%]">
          <p className="text-[clamp(0.5rem,8cqw,1.1rem)] font-bold uppercase leading-tight tracking-[0.2em] text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-1 text-[clamp(0.4rem,4.5cqw,0.65rem)] uppercase tracking-[0.3em] text-white/60">
              {subtitle}
            </p>
          ) : null}
        </div>
        {/* abstract centerpiece — stands in for the poster illustration */}
        <div className="my-[6%] flex aspect-square w-1/2 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] backdrop-blur-[1px]">
          <div className="h-1/2 w-1/2 rounded-full bg-white/10" />
        </div>
        {footer ? (
          <p className="w-full border-t border-white/20 pt-[4%] text-[clamp(0.35rem,4cqw,0.6rem)] uppercase tracking-[0.25em] text-white/60">
            {footer}
          </p>
        ) : null}
      </div>
    </GradientArt>
  );
}
