import type { Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import * as seed from "@/lib/data";

/**
 * Copy the demo archive (lib/data.ts) into a user's account. Idempotent:
 * rows reuse the seed ids / unique keys, so re-runs no-op. Used by the
 * dashboard "copy the demo shows" button and scripts/seed-demo.ts.
 */
export async function seedDemoForUser(db: Db, userId: string): Promise<void> {
  await db
    .insert(t.artists)
    .values(seed.artists.map((a) => ({ ...a })))
    .onConflictDoNothing();
  await db
    .insert(t.venues)
    .values(seed.venues.map((v) => ({ ...v })))
    .onConflictDoNothing();
  await db
    .insert(t.tours)
    .values(seed.tours.map((tour) => ({ ...tour })))
    .onConflictDoNothing();
  await db
    .insert(t.shows)
    .values(
      seed.shows.map((s) => ({
        id: s.id,
        artistId: s.artistId,
        venueId: s.venueId,
        tourId: s.tourId,
        date: s.date,
        showTime: s.showTime,
        gradient: s.gradient,
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(t.userShows)
    .values(
      seed.shows.map((s) => ({
        userId,
        showId: s.id,
        attended: s.attended,
        favorite: s.favorite,
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(t.posters)
    .values(seed.posters.map((p) => ({ ...p, userId })))
    .onConflictDoNothing();
  if (seed.ephemera.length) {
    await db
      .insert(t.ephemeraItems)
      .values(seed.ephemera.map((e) => ({ ...e, userId })))
      .onConflictDoNothing();
  }
  if (seed.memories.length) {
    await db
      .insert(t.memories)
      .values(
        seed.memories.map((m) => ({
          id: m.id,
          userId,
          showId: m.showId,
          text: m.text,
          attendedWith: m.attendedWith,
          createdAt: new Date(m.createdAt),
        })),
      )
      .onConflictDoNothing();
  }
  await db
    .insert(t.mediaLinks)
    .values(seed.mediaLinks.map((m) => ({ ...m, userId })))
    .onConflictDoNothing();
  await db
    .insert(t.showPhotos)
    .values(seed.showPhotos.map((p) => ({ ...p, userId })))
    .onConflictDoNothing();
  await db
    .insert(t.collections)
    .values(seed.collections.map((c) => ({ ...c, userId })))
    .onConflictDoNothing();
}
