/**
 * Find-or-create helpers for the canonical music tables. Shared by the
 * setlist.fm importer and the manual add-show form so both paths dedupe
 * the same way (unique constraints in lib/db/schema.ts back these up).
 */

import { and, eq } from "drizzle-orm";

import type { Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { gradientFor } from "@/lib/archive";

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
