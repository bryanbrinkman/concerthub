import { cn } from "@/lib/utils";
import type { GradientKey } from "@/lib/types";

/**
 * Default artwork for shows with no poster/photo: a vintage ticket stub.
 * Cream paper, colored venue band, dot-matrix mono type, SEC/ROW/SEAT grid,
 * perforation + barcode. Seat numbers are deterministic per show id so the
 * stub is stable across renders.
 */

const BAND_COLORS: Record<GradientKey, string> = {
  aurora: "bg-purple-900",
  dusk: "bg-indigo-900",
  ember: "bg-rose-900",
  ocean: "bg-sky-900",
  jade: "bg-emerald-900",
  gold: "bg-amber-800",
  midnight: "bg-zinc-800",
  neon: "bg-fuchsia-900",
};

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface TicketArtProps {
  /** Stable seed for the fake section/row/seat/serial numbers. */
  seedId: string;
  artist: string;
  venue?: string;
  cityLine?: string;
  /** e.g. "Tue, Jul 13, 2004" — rendered uppercase, dot-matrix style. */
  dateLine: string;
  timeLine?: string;
  /** Top small line; falls back to the classic "An Evening With". */
  tourLine?: string;
  gradient: GradientKey;
  className?: string;
}

export function TicketArt({
  seedId,
  artist,
  venue,
  cityLine,
  dateLine,
  timeLine,
  tourLine,
  gradient,
  className,
}: TicketArtProps) {
  const h = hash(seedId);
  const sec = 100 + (h % 300);
  const row = 1 + ((h >> 3) % 30);
  const seat = 1 + ((h >> 7) % 28);
  const serial = String(h % 100000000).padStart(8, "0");

  return (
    <div
      className={cn(
        "@container relative aspect-[3/4] overflow-hidden rounded-lg bg-[#eae4d2] text-zinc-900",
        className,
      )}
    >
      {/* header band */}
      <div
        className={cn(
          "flex h-[11%] items-center justify-between px-[6%] font-mono text-[clamp(0.28rem,3cqw,0.5rem)] tracking-[0.18em] text-white/90",
          BAND_COLORS[gradient],
        )}
      >
        <span>ADULT {serial.slice(0, 4)}</span>
        <span className="italic">concertcollect</span>
      </div>

      {/* body */}
      <div className="flex h-[74%] flex-col items-center justify-center gap-[2.5%] px-[7%] text-center font-mono uppercase">
        <p className="tracking-[0.22em] text-[clamp(0.28rem,3.2cqw,0.5rem)] text-zinc-500">
          {(tourLine ?? "An Evening With").toUpperCase()}
        </p>
        <p className="w-full text-[clamp(0.55rem,7.5cqw,1.1rem)] font-bold leading-tight tracking-tight">
          {artist.toUpperCase()}
        </p>
        {venue ? (
          <p className="w-full text-[clamp(0.32rem,4cqw,0.6rem)] tracking-[0.12em]">
            {venue.toUpperCase()}
          </p>
        ) : null}
        {cityLine ? (
          <p className="w-full text-[clamp(0.28rem,3.4cqw,0.5rem)] tracking-[0.14em] text-zinc-500">
            {cityLine.toUpperCase()}
          </p>
        ) : null}
        <div className="my-[2%] grid w-full grid-cols-3 border-y border-zinc-900/25 py-[3%]">
          {(
            [
              ["SEC", sec],
              ["ROW", row],
              ["SEAT", seat],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <p className="text-[clamp(0.26rem,3cqw,0.45rem)] tracking-[0.2em] text-zinc-500">
                {label}
              </p>
              <p className="text-[clamp(0.4rem,4.6cqw,0.7rem)] font-bold">
                {value}
              </p>
            </div>
          ))}
        </div>
        <p className="w-full text-[clamp(0.32rem,3.8cqw,0.58rem)] font-bold tracking-[0.12em]">
          {dateLine.toUpperCase()}
          {timeLine ? ` · ${timeLine.toUpperCase()}` : ""}
        </p>
      </div>

      {/* perforation + barcode */}
      <div className="absolute inset-x-0 bottom-[12%] border-t border-dashed border-zinc-900/30" />
      <div
        className="absolute inset-x-[7%] bottom-[3.5%] h-[5.5%] opacity-80"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #1c1c1c 0 2px, transparent 2px 5px)",
        }}
      />
      {/* perforation notches (match the card surface behind the stub) */}
      <div className="absolute -left-2 bottom-[10%] h-4 w-4 rounded-full bg-card" />
      <div className="absolute -right-2 bottom-[10%] h-4 w-4 rounded-full bg-card" />

      {/* paper aging */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_-10%,transparent_55%,rgba(92,72,32,0.22))]" />
    </div>
  );
}
