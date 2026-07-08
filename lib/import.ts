/**
 * Core import logic shared by the chunked import API route. Upserts one
 * page of a setlist.fm attendance history into the user's archive.
 *
 * Dedupe layers (a setlist.fm record is ONE PERFORMER'S SET, which may
 * be part of a larger real-world event):
 *  1. Same setlist id already imported — as a show or as a performer's
 *     set on a show → reuse that show.
 *  2. Same venue + same date → the same real-world event (festival, co-
 *     headline bill, multi-act night): attach this performer to the
 *     existing show's bill instead of creating a duplicate show. The
 *     performer's set keeps its own setlist.fm link on the lineup row.
 *  3. Otherwise → create the show with this performer as headliner.
 */

import { and, eq } from "drizzle-orm";

import type { Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { gradientFor } from "@/lib/archive";
import { upsertArtist, upsertTour, upsertVenue } from "@/lib/upserts";
import { fetchAttendedShows, type ImportedShow } from "@/lib/setlistfm";

async function upsertImportedShow(db: Db, item: ImportedShow): Promise<string> {
  // Layer 1: this exact set is already in the archive.
  const asShow = await db
    .select({ id: t.shows.id })
    .from(t.shows)
    .where(eq(t.shows.setlistFmId, item.setlistFmId));
  if (asShow[0]) return asShow[0].id;
  const asSet = await db
    .select({ showId: t.showPerformers.showId })
    .from(t.showPerformers)
    .where(eq(t.showPerformers.setlistFmId, item.setlistFmId));
  if (asSet[0]) return asSet[0].showId;

  const artistId = await upsertArtist(db, item.artistName);
  const venueId = await upsertVenue(
    db,
    item.venueName,
    item.city,
    item.region,
    item.country,
  );

  // Layer 2: same venue + date = same real-world event.
  const sameEvent = await db
    .select({ id: t.shows.id })
    .from(t.shows)
    .where(and(eq(t.shows.venueId, venueId), eq(t.shows.date, item.date)));
  if (sameEvent[0]) {
    const showId = sameEvent[0].id;
    const bill = await db
      .select({
        artistId: t.showPerformers.artistId,
        billingOrder: t.showPerformers.billingOrder,
      })
      .from(t.showPerformers)
      .where(eq(t.showPerformers.showId, showId));
    const already = bill.find((row) => row.artistId === artistId);
    if (!already) {
      const order =
        bill.reduce((max, row) => Math.max(max, row.billingOrder), 0) + 1;
      await db
        .insert(t.showPerformers)
        .values({
          showId,
          artistId,
          // One set at a shared event tells us nothing about billing.
          billingRole: "unknown",
          billingOrder: order,
          setlistFmId: item.setlistFmId,
          setlistFmUrl: item.url,
          source: "setlist.fm",
          confidence: "inferred",
        })
        .onConflictDoNothing();
    } else {
      // Performer already billed (e.g. added by hand) — attach their set.
      await db
        .update(t.showPerformers)
        .set({ setlistFmId: item.setlistFmId, setlistFmUrl: item.url })
        .where(
          and(
            eq(t.showPerformers.showId, showId),
            eq(t.showPerformers.artistId, artistId),
          ),
        );
    }
    return showId;
  }

  // Layer 3: genuinely new event.
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
  let showId = inserted[0]?.id;
  if (!showId) {
    // Lost a race with a concurrent import of the same setlist.
    const again = await db
      .select({ id: t.shows.id })
      .from(t.shows)
      .where(eq(t.shows.setlistFmId, item.setlistFmId));
    showId = again[0].id;
  }
  await db
    .insert(t.showPerformers)
    .values({
      showId,
      artistId,
      billingRole: "headliner",
      billingOrder: 1,
      setlistFmId: item.setlistFmId,
      setlistFmUrl: item.url,
      source: "setlist.fm",
    })
    .onConflictDoNothing();
  return showId;
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
