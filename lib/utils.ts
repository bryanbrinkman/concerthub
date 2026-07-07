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
