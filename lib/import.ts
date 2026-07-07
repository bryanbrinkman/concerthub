/**
 * Core import logic shared by the chunked import API route. Upserts one
 * page of a setlist.fm attendance history into the user's archive —
 * shows dedupe on their setlist.fm id, so re-imports are always safe.
 */

import { eq } from "drizzle-orm";

import type { Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { gradientFor } from "@/lib/archive";
import { upsertArtist, upsertTour, upsertVenue } from "@/lib/upserts";
import { fetchAttendedShows, type ImportedShow } from "@/lib/setlistfm";

async function upsertImportedShow(db: Db, item: ImportedShow): Promise<string> {
  const existing = await db
    .select({ id: t.shows.id })
    .from(t.shows)
    .where(eq(t.shows.setlistFmId, item.setlistFmId));
  if (existing[0]) return existing[0].id;

  const artistId = await upsertArtist(db, item.artistName);
  const venueId = await upsertVenue(
    db,
    item.venueName,
    item.city,
    item.region,
    item.country,
  );
  const tourId = item.tourName
    ? await upsertTour(db, artistId, item.tourName, item.date.slice(0, 4))
    : undefined;

  const inserted = await db
    .insert(t.shows)
    .values({
      artistId,
      venueId,
      tourId,
      date: item.date,
      gradient: gradientFor(item.artistName + item.date),
      setlistFmId: item.setlistFmId,
      setlistFmUrl: item.url,
    })
    .onConflictDoNothing()
    .returning({ id: t.shows.id });
  if (inserted[0]) return inserted[0].id;
  const again = await db
    .select({ id: t.shows.id })
    .from(t.shows)
    .where(eq(t.shows.setlistFmId, item.setlistFmId));
  return again[0].id;
}

export interface ImportPageResult {
  ok: boolean;
  error?: string;
  imported: number;
  failed: number;
  total: number;
  itemsPerPage: number;
}

/** Import one page of a user's attended history. */
export async function importPageForUser(
  db: Db,
  userId: string,
  username: string,
  page: number,
): Promise<ImportPageResult> {
  const result = await fetchAttendedShows(username, page);
  if (!result.ok) {
    return { ok: false, error: result.error, imported: 0, failed: 0, total: 0, itemsPerPage: 20 };
  }

  let imported = 0;
  let failed = 0;
  for (const item of result.shows) {
    try {
      const showId = await upsertImportedShow(db, item);
      await db
        .insert(t.userShows)
        .values({ userId, showId, attended: true })
        .onConflictDoNothing();
      imported++;
    } catch (error) {
      console.warn(`[import] failed for ${item.setlistFmId}:`, error);
      failed++;
    }
  }

  return {
    ok: true,
    imported,
    failed,
    total: result.total,
    itemsPerPage: result.itemsPerPage,
  };
}
