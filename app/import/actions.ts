"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb, type Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { gradientFor } from "@/lib/archive";
import { fetchAttendedShows, type ImportedShow } from "@/lib/setlistfm";

/**
 * Real setlist.fm import: walk the user's attended-shows history and upsert
 * canonical artist/venue/show rows plus a user_show attendance row for each.
 * Re-running is safe — shows dedupe on their setlist.fm id.
 */

// Stay inside serverless limits: ~20 shows per page, polite API pacing.
const MAX_PAGES = 20;
const PAGE_DELAY_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function upsertArtist(db: Db, name: string): Promise<string> {
  const existing = await db
    .select({ id: t.artists.id })
    .from(t.artists)
    .where(eq(t.artists.name, name));
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(t.artists)
    .values({ name, gradient: gradientFor(name) })
    .onConflictDoNothing()
    .returning({ id: t.artists.id });
  if (inserted[0]) return inserted[0].id;
  // Lost a race with a concurrent insert — read it back.
  const again = await db
    .select({ id: t.artists.id })
    .from(t.artists)
    .where(eq(t.artists.name, name));
  return again[0].id;
}

async function upsertVenue(db: Db, item: ImportedShow): Promise<string> {
  const { venueName: name, city } = item;
  const existing = await db
    .select({ id: t.venues.id })
    .from(t.venues)
    .where(and(eq(t.venues.name, name), eq(t.venues.city, city)));
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(t.venues)
    .values({
      name,
      city,
      region: item.region,
      country: item.country,
      gradient: gradientFor(name + city),
    })
    .onConflictDoNothing()
    .returning({ id: t.venues.id });
  if (inserted[0]) return inserted[0].id;
  const again = await db
    .select({ id: t.venues.id })
    .from(t.venues)
    .where(and(eq(t.venues.name, name), eq(t.venues.city, city)));
  return again[0].id;
}

async function upsertTour(
  db: Db,
  artistId: string,
  name: string,
  year: string,
): Promise<string> {
  const existing = await db
    .select({ id: t.tours.id })
    .from(t.tours)
    .where(and(eq(t.tours.artistId, artistId), eq(t.tours.name, name)));
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(t.tours)
    .values({ artistId, name, years: year })
    .onConflictDoNothing()
    .returning({ id: t.tours.id });
  if (inserted[0]) return inserted[0].id;
  const again = await db
    .select({ id: t.tours.id })
    .from(t.tours)
    .where(and(eq(t.tours.artistId, artistId), eq(t.tours.name, name)));
  return again[0].id;
}

async function upsertShow(db: Db, item: ImportedShow): Promise<string> {
  const existing = await db
    .select({ id: t.shows.id })
    .from(t.shows)
    .where(eq(t.shows.setlistFmId, item.setlistFmId));
  if (existing[0]) return existing[0].id;

  const artistId = await upsertArtist(db, item.artistName);
  const venueId = await upsertVenue(db, item);
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

export async function importAttendedAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  if (!username) redirect("/import");

  const userId = await currentUserId();
  if (!userId) {
    redirect(`/import?user=${encodeURIComponent(username)}&error=signin`);
  }
  const db = getDb();
  if (!db) {
    redirect(`/import?user=${encodeURIComponent(username)}&error=nodb`);
  }

  let imported = 0;
  let total = 0;
  let partial = false;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await fetchAttendedShows(username, page);
    if (!result.ok) break;
    total = result.total;

    for (const item of result.shows) {
      try {
        const showId = await upsertShow(db, item);
        await db
          .insert(t.userShows)
          .values({ userId: userId as string, showId, attended: true })
          .onConflictDoNothing();
        imported++;
      } catch (error) {
        console.warn(`[import] failed for ${item.setlistFmId}:`, error);
      }
    }

    if (page * result.itemsPerPage >= result.total) break;
    if (page === MAX_PAGES) partial = true;
    await sleep(PAGE_DELAY_MS);
  }

  revalidatePath("/", "layout");
  redirect(
    `/import?user=${encodeURIComponent(username)}&done=${imported}&total=${total}${
      partial ? "&partial=1" : ""
    }`,
  );
}
