/**
 * Find-or-create helpers for the canonical music tables. Shared by the
 * setlist.fm importer and the manual add-show form so both paths dedupe
 * the same way (unique constraints in lib/db/schema.ts back these up).
 */

import { and, eq } from "drizzle-orm";

import type { Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { gradientFor } from "@/lib/archive";
import { posterArtistSlug } from "@/lib/utils";

/**
 * Record a poster artist (print designer) keyed by slug, optionally with a
 * website. The name is refreshed to the latest spelling; the website is only
 * set when provided (so a later poster with a blank field can't wipe it).
 * Skips blank/"Unknown" credits. Throws if the poster_artist table isn't
 * migrated yet — callers wrap this best-effort.
 */
export async function upsertPosterArtist(
  db: Db,
  name: string,
  website?: string,
): Promise<void> {
  const clean = name.trim();
  if (!clean || clean.toLowerCase() === "unknown") return;
  const slug = posterArtistSlug(clean);
  if (!slug) return;
  const site = website?.trim() || undefined;
  await db
    .insert(t.posterArtists)
    .values({ slug, name: clean, website: site })
    .onConflictDoUpdate({
      target: t.posterArtists.slug,
      set: site ? { name: clean, website: site } : { name: clean },
    });
}

export async function upsertArtist(db: Db, name: string): Promise<string> {
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

export async function upsertVenue(
  db: Db,
  name: string,
  city: string,
  region?: string,
  country?: string,
): Promise<string> {
  const existing = await db
    .select({ id: t.venues.id })
    .from(t.venues)
    .where(and(eq(t.venues.name, name), eq(t.venues.city, city)));
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(t.venues)
    .values({ name, city, region, country, gradient: gradientFor(name + city) })
    .onConflictDoNothing()
    .returning({ id: t.venues.id });
  if (inserted[0]) return inserted[0].id;
  const again = await db
    .select({ id: t.venues.id })
    .from(t.venues)
    .where(and(eq(t.venues.name, name), eq(t.venues.city, city)));
  return again[0].id;
}

export interface LineupEntry {
  name: string;
  role: string;
}

/**
 * Replace a show's bill with the given entries (billing order = array
 * order, starting at 1). Names are upserted as full artist rows so every
 * performer appears in the Artists section. Per-performer setlist.fm
 * links survive edits — they're re-attached by artist id.
 */
export async function setShowLineup(
  db: Db,
  showId: string,
  entries: LineupEntry[],
): Promise<void> {
  const existing = await db
    .select()
    .from(t.showPerformers)
    .where(eq(t.showPerformers.showId, showId));
  const previous = new Map(existing.map((row) => [row.artistId, row]));

  await db
    .delete(t.showPerformers)
    .where(eq(t.showPerformers.showId, showId));

  const seen = new Set<string>();
  let order = 1;
  for (const entry of entries) {
    const name = entry.name.trim();
    if (!name) continue;
    const artistId = await upsertArtist(db, name);
    if (seen.has(artistId)) continue;
    seen.add(artistId);
    const prev = previous.get(artistId);
    await db
      .insert(t.showPerformers)
      .values({
        showId,
        artistId,
        billingRole: entry.role,
        billingOrder: order++,
        setlistFmId: prev?.setlistFmId,
        setlistFmUrl: prev?.setlistFmUrl,
        stage: prev?.stage,
        setTime: prev?.setTime,
        source: prev?.source ?? "user",
      })
      .onConflictDoNothing();
  }
}

/**
 * Add entries to an existing bill without touching what's already there
 * (used when an add-show form matches an existing canonical event).
 */
export async function addToShowLineup(
  db: Db,
  showId: string,
  entries: LineupEntry[],
): Promise<void> {
  const existing = await db
    .select({ billingOrder: t.showPerformers.billingOrder })
    .from(t.showPerformers)
    .where(eq(t.showPerformers.showId, showId));
  let order =
    existing.reduce((max, row) => Math.max(max, row.billingOrder), 0) + 1;
  for (const entry of entries) {
    const name = entry.name.trim();
    if (!name) continue;
    const artistId = await upsertArtist(db, name);
    await db
      .insert(t.showPerformers)
      .values({ showId, artistId, billingRole: entry.role, billingOrder: order++ })
      .onConflictDoNothing();
  }
}

export async function upsertTour(
  db: Db,
  artistId: string,
  name: string,
  years: string,
): Promise<string> {
  const existing = await db
    .select({ id: t.tours.id })
    .from(t.tours)
    .where(and(eq(t.tours.artistId, artistId), eq(t.tours.name, name)));
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(t.tours)
    .values({ artistId, name, years })
    .onConflictDoNothing()
    .returning({ id: t.tours.id });
  if (inserted[0]) return inserted[0].id;
  const again = await db
    .select({ id: t.tours.id })
    .from(t.tours)
    .where(and(eq(t.tours.artistId, artistId), eq(t.tours.name, name)));
  return again[0].id;
}
