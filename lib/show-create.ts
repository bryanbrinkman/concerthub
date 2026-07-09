/**
 * Shared show-creation logic — used by both the classic add-show server
 * action and the stepped wizard's API route, so the two paths dedupe,
 * bill, and link setlists identically.
 */

import { and, eq, isNull } from "drizzle-orm";

import type { Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { gradientFor } from "@/lib/archive";
import {
  addToShowLineup,
  setShowLineup,
  upsertArtist,
  upsertTour,
  upsertVenue,
  type LineupEntry,
} from "@/lib/upserts";
import { parseSetlistFmUrl } from "@/lib/setlistfm";

export const EVENT_TYPES = new Set([
  "concert",
  "festival",
  "festival_day",
  "multi_act",
  "other",
]);

export interface CreateShowInput {
  artistName: string;
  venueName: string;
  city?: string;
  region?: string;
  country?: string;
  date: string; // yyyy-mm-dd
  showTime?: string;
  eventType?: string;
  eventName?: string;
  endDate?: string;
  tourName?: string;
  /** Support acts / co-headliners / festival lineup, in billing order. */
  lineup?: LineupEntry[];
  setlistFmUrl?: string;
  favorite?: boolean;
}

/**
 * A pasted setlist.fm URL resolves to a setlist id, unless that id is
 * already claimed by a different canonical show.
 */
async function claimSetlistFmId(
  db: Db,
  url: string,
): Promise<string | undefined> {
  const parsed = parseSetlistFmUrl(url);
  if (!parsed) return undefined;
  const taken = await db
    .select({ id: t.shows.id })
    .from(t.shows)
    .where(eq(t.shows.setlistFmId, parsed));
  return taken[0] ? undefined : parsed;
}

/**
 * Create (or reuse) a canonical show and attach it to the user's
 * archive. Returns the show id. Idempotent on artist+venue+date, so
 * re-adding the same show just joins the existing record.
 */
export async function createShow(
  db: Db,
  userId: string,
  input: CreateShowInput,
): Promise<string> {
  const artistName = input.artistName.trim();
  const venueName = input.venueName.trim();
  const date = input.date.trim();

  const artistId = await upsertArtist(db, artistName);
  const venueId = await upsertVenue(
    db,
    venueName,
    input.city?.trim() ?? "",
    input.region?.trim() || undefined,
    input.country?.trim() || undefined,
  );
  const tourName = input.tourName?.trim() || undefined;
  const tourId = tourName
    ? await upsertTour(db, artistId, tourName, date.slice(0, 4))
    : undefined;

  const existing = await db
    .select({ id: t.shows.id })
    .from(t.shows)
    .where(
      and(
        eq(t.shows.artistId, artistId),
        eq(t.shows.venueId, venueId),
        eq(t.shows.date, date),
      ),
    );

  const setlistFmUrl = input.setlistFmUrl?.trim() || undefined;
  const setlistFmId = setlistFmUrl
    ? await claimSetlistFmId(db, setlistFmUrl)
    : undefined;

  const eventType =
    input.eventType && EVENT_TYPES.has(input.eventType)
      ? input.eventType
      : "concert";
  const eventName = input.eventName?.trim() || undefined;
  const endDate =
    input.endDate && input.endDate > date ? input.endDate : undefined;
  const lineup = (input.lineup ?? []).filter((e) => e.name.trim());

  let showId = existing[0]?.id;
  if (!showId) {
    const inserted = await db
      .insert(t.shows)
      .values({
        artistId,
        venueId,
        tourId,
        name: eventName,
        eventType,
        date,
        endDate,
        showTime: input.showTime?.trim() || undefined,
        gradient: gradientFor((eventName ?? artistName) + date),
        setlistFmId,
        setlistFmUrl: setlistFmId ? setlistFmUrl : undefined,
      })
      .returning({ id: t.shows.id });
    showId = inserted[0].id;
    await setShowLineup(db, showId, [
      { name: artistName, role: "headliner" },
      ...lineup,
    ]);
  } else {
    if (setlistFmId) {
      await db
        .update(t.shows)
        .set({ setlistFmId, setlistFmUrl })
        .where(and(eq(t.shows.id, showId), isNull(t.shows.setlistFmId)));
    }
    await addToShowLineup(db, showId, [
      { name: artistName, role: "headliner" },
      ...lineup,
    ]);
  }

  await db
    .insert(t.userShows)
    .values({ userId, showId, attended: true, favorite: input.favorite ?? false })
    .onConflictDoNothing();

  return showId;
}
