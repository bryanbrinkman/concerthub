import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "2022-09-14" -> "Wed, Sep 14, 2022" (parsed as a local date, not UTC). */
export function formatShowDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Physical print size in inches from a legacy dimensions string —
 * `18" x 24"`, `18x24`, `18 × 24 in` all parse (width first).
 */
export function parsePosterSizeIn(
  dimensions?: string,
): { widthIn: number; heightIn: number } | undefined {
  if (!dimensions) return undefined;
  const match = dimensions.match(
    /(\d+(?:\.\d+)?)\s*(?:"|”|in(?:ch(?:es)?)?)?\s*[x×]\s*(\d+(?:\.\d+)?)/i,
  );
  if (!match) return undefined;
  const widthIn = Number(match[1]);
  const heightIn = Number(match[2]);
  if (!Number.isFinite(widthIn) || widthIn <= 3 || widthIn >= 100) {
    return undefined;
  }
  return {
    widthIn,
    heightIn:
      Number.isFinite(heightIn) && heightIn > 3 && heightIn < 100
        ? heightIn
        : widthIn,
  };
}

/** Edition size for display: structured fields first, legacy fallback. */
export function formatEditionSize(edition?: {
  widthIn?: number;
  heightIn?: number;
  dimensions?: string;
}): string | undefined {
  if (edition?.widthIn && edition?.heightIn) {
    return `${edition.widthIn}" × ${edition.heightIn}"`;
  }
  return edition?.dimensions || undefined;
}

/** "2014-06-06".."2014-06-08" → "June 6–8, 2014" (multi-day events). */
export function formatDateRange(startIso: string, endIso: string): string {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const month = (m: number, style: "long" | "short" = "long") =>
    new Date(2000, m - 1, 1).toLocaleDateString("en-US", { month: style });
  if (sy === ey && sm === em) return `${month(sm)} ${sd}–${ed}, ${sy}`;
  if (sy === ey)
    return `${month(sm, "short")} ${sd} – ${month(em, "short")} ${ed}, ${sy}`;
  return `${month(sm, "short")} ${sd}, ${sy} – ${month(em, "short")} ${ed}, ${ey}`;
}

/**
 * Pull real section/row/seat/price out of a ticket ephemera detail line
 * like "Sec 110 · Row 18 · Seat 7 · $89.50" so the default ticket-stub
 * artwork can print the actual seats.
 */
export function parseTicketStub(detail?: string): {
  sec?: string;
  row?: string;
  seat?: string;
  price?: string;
} {
  if (!detail) return {};
  const sec = detail.match(/sec(?:tion)?\.?\s*[:#]?\s*([A-Za-z0-9]+)/i)?.[1];
  const row = detail.match(/row\.?\s*[:#]?\s*([A-Za-z0-9]+)/i)?.[1];
  const seat = detail.match(/seat\.?\s*[:#]?\s*([A-Za-z0-9]+)/i)?.[1];
  const price = detail.match(/\$\s?(\d+(?:\.\d{2})?)/)?.[0]?.replace(/\s/, "");
  return { sec, row, seat, price };
}

/** "2022-09-14" -> "Sep 14, 2022" */
export function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
