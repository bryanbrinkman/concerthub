import * as React from "react";

import { cn } from "@/lib/utils";
import type { GradientKey } from "@/lib/types";

/**
 * Placeholder artwork.
 *
 * No real poster/photo assets ship with the MVP (and we avoid copyrighted
 * imagery), so every visual is a generated gradient card. When real uploads
 * or API-sourced images exist, swap these for <Image> without changing the
 * surrounding layout.
 */
const GRADIENTS: Record<GradientKey, string> = {
  aurora: "from-violet-600 via-purple-500 to-fuchsia-600",
  dusk: "from-indigo-950 via-purple-800 to-rose-700",
  ember: "from-orange-600 via-rose-600 to-purple-800",
  ocean: "from-cyan-600 via-blue-700 to-indigo-950",
  jade: "from-emerald-600 via-teal-600 to-cyan-900",
  gold: "from-amber-500 via-orange-600 to-rose-800",
  midnight: "from-slate-700 via-indigo-950 to-black",
  neon: "from-fuchsia-600 via-purple-600 to-blue-700",
};

interface GradientArtProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient: GradientKey;
}

export function GradientArt({
  gradient,
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
      {...props}
    >
      {/* soft light + vignette so flat gradients read as printed art */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_100%_at_85%_110%,rgba(0,0,0,0.4),transparent_60%)]" />
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
  className?: string;
}

/** A gig-poster-styled placeholder: bordered, typographic, archival. */
export function PosterArt({
  gradient,
  title,
  subtitle,
  footer,
  className,
}: PosterArtProps) {
  return (
    <GradientArt
      gradient={gradient}
      className={cn("@container aspect-[3/4] rounded-lg", className)}
    >
      <div className="flex w-full flex-col items-center justify-between p-[8%] text-center">
        <div className="w-full border border-white/40 px-2 py-[6%]">
          <p className="text-[clamp(0.5rem,8cqw,1.1rem)] font-bold uppercase leading-tight tracking-[0.2em] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-1 text-[clamp(0.4rem,4.5cqw,0.65rem)] uppercase tracking-[0.3em] text-white/80">
              {subtitle}
            </p>
          ) : null}
        </div>
        {/* abstract centerpiece — stands in for the poster illustration */}
        <div className="my-[6%] flex aspect-square w-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-[1px]">
          <div className="h-1/2 w-1/2 rounded-full bg-white/20" />
        </div>
        {footer ? (
          <p className="w-full border-t border-white/30 pt-[4%] text-[clamp(0.35rem,4cqw,0.6rem)] uppercase tracking-[0.25em] text-white/80">
            {footer}
          </p>
        ) : null}
      </div>
    </GradientArt>
  );
}
