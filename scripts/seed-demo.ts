/**
 * Copy the demo archive (lib/data.ts) into a real user's account.
 *
 * Usage:
 *   1. Sign in to the app once so your user row exists.
 *   2. DATABASE_URL=postgres://... npm run db:seed-demo -- you@example.com
 *      (DATABASE_URL is also read from .env.local if present.)
 *
 * Idempotent: rows reuse the seed ids / unique keys, so re-runs no-op.
 */

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

import * as t from "../lib/db/schema";
import * as seed from "../lib/data";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* no .env.local — rely on the environment */
  }
}

async function main() {
  loadEnvLocal();
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npm run db:seed-demo -- you@example.com");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const db = drizzle(neon(process.env.DATABASE_URL));

  const userRows = await db
    .select({ id: t.users.id })
    .from(t.users)
    .where(eq(t.users.email, email));
  const user = userRows[0];
  if (!user) {
    throw new Error(
      `No user with email ${email} — sign in to the app once first.`,
    );
  }

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
        userId: user.id,
        showId: s.id,
        attended: s.attended,
        favorite: s.favorite,
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(t.posters)
    .values(seed.posters.map((p) => ({ ...p, userId: user.id })))
    .onConflictDoNothing();
  if (seed.ephemera.length) {
    await db
      .insert(t.ephemeraItems)
      .values(seed.ephemera.map((e) => ({ ...e, userId: user.id })))
      .onConflictDoNothing();
  }
  if (seed.memories.length) {
    await db
      .insert(t.memories)
      .values(
        seed.memories.map((m) => ({
          id: m.id,
          userId: user.id,
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
    .values(seed.mediaLinks.map((m) => ({ ...m, userId: user.id })))
    .onConflictDoNothing();
  await db
    .insert(t.showPhotos)
    .values(seed.showPhotos.map((p) => ({ ...p, userId: user.id })))
    .onConflictDoNothing();
  await db
    .insert(t.collections)
    .values(seed.collections.map((c) => ({ ...c, userId: user.id })))
    .onConflictDoNothing();

  console.log(`Seeded demo archive for ${email} (${seed.shows.length} shows).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
