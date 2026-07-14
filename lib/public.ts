/**
 * Viewer-independent reads for public archive detail pages.
 *
 * The detail pages historically read from getArchive() (the viewer's own
 * rows), which meant a logged-out crawler saw the demo archive or a 404.
 * These helpers read the canonical record straight from the DB so public
 * pages are genuinely public and server-render their identifying content.
 *
 * Every function degrades to null on failure (missing DB, pending
 * migration) so pages can fall back to the viewer archive.
 */

import { desc, eq, inArray, sql } from "drizzle-orm";

import { getDb, type Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { posterArtistSlug } from "@/lib/utils";
import type { BillingRole, EventType } from "@/lib/types";

export interface PublicPerformer {
  artistId: string;
  name: string;
  billingRole: BillingRole;
  billingOrder: number;
  setlistFmUrl?: string;
}

export interface PublicShow {
  id: string;
  name?: string;
  eventType: EventType;
  festivalId?: string;
  date: string;
  endDate?: string;
  showTime?: string;
  venueId: string;
  venueName: string;
  venueCity: string;
  venueRegion?: string;
  venueCountry?: string;
  primaryArtistId: string;
  primaryArtistName: string;
  performers: PublicPerformer[];
  posterImage?: string;
  posterId?: string;
}

export async function getPublicShow(id: string): Promise<PublicShow | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const [row] = await db
      .select({
        id: t.shows.id,
        name: t.shows.name,
        eventType: t.shows.eventType,
        festivalId: t.shows.festivalId,
        date: t.shows.date,
        endDate: t.shows.endDate,
        showTime: t.shows.showTime,
        venueId: t.shows.venueId,
        venueName: t.venues.name,
        venueCity: t.venues.city,
        venueRegion: t.venues.region,
        venueCountry: t.venues.country,
        primaryArtistId: t.shows.artistId,
        primaryArtistName: t.artists.name,
      })
      .from(t.shows)
      .innerJoin(t.artists, eq(t.shows.artistId, t.artists.id))
      .innerJoin(t.venues, eq(t.shows.venueId, t.venues.id))
      .where(eq(t.shows.id, id));
    if (!row) return null;

    let performers: PublicPerformer[] = [];
    try {
      const bill = await db
        .select({
          artistId: t.showPerformers.artistId,
          name: t.artists.name,
          billingRole: t.showPerformers.billingRole,
          billingOrder: t.showPerformers.billingOrder,
          setlistFmUrl: t.showPerformers.setlistFmUrl,
        })
        .from(t.showPerformers)
        .innerJoin(t.artists, eq(t.showPerformers.artistId, t.artists.id))
        .where(eq(t.showPerformers.showId, id));
      performers = bill
        .sort((a, b) => a.billingOrder - b.billingOrder)
        .map((p) => ({
          artistId: p.artistId,
          name: p.name,
          billingRole: p.billingRole as BillingRole,
          billingOrder: p.billingOrder,
          setlistFmUrl: p.setlistFmUrl ?? undefined,
        }));
    } catch {
      // Lineup table pending migration — fall back to the primary act.
    }
    if (performers.length === 0) {
      performers = [
        {
          artistId: row.primaryArtistId,
          name: row.primaryArtistName,
          billingRole: "headliner",
          billingOrder: 1,
        },
      ];
    }

    const posters = await db
      .select({ id: t.posters.id, imageUrl: t.posters.imageUrl })
      .from(t.posters)
      .where(eq(t.posters.showId, id));
    const withImage = posters.find((p) => p.imageUrl);

    return {
      id: row.id,
      name: row.name ?? undefined,
      eventType: (row.eventType ?? "concert") as EventType,
      festivalId: row.festivalId ?? undefined,
      date: row.date,
      endDate: row.endDate ?? undefined,
      showTime: row.showTime ?? undefined,
      venueId: row.venueId,
      venueName: row.venueName,
      venueCity: row.venueCity,
      venueRegion: row.venueRegion ?? undefined,
      venueCountry: row.venueCountry ?? undefined,
      primaryArtistId: row.primaryArtistId,
      primaryArtistName: row.primaryArtistName,
      performers,
      posterImage: withImage?.imageUrl ?? undefined,
      posterId: withImage?.id,
    };
  } catch (error) {
    console.warn("[public] show read failed:", error);
    return null;
  }
}

export interface PublicArtist {
  id: string;
  name: string;
  hometown?: string;
  genres: string[];
}

export async function getPublicArtist(id: string): Promise<PublicArtist | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const [row] = await db
      .select({
        id: t.artists.id,
        name: t.artists.name,
        hometown: t.artists.hometown,
        genres: t.artists.genres,
      })
      .from(t.artists)
      .where(eq(t.artists.id, id));
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      hometown: row.hometown ?? undefined,
      genres: row.genres ?? [],
    };
  } catch (error) {
    console.warn("[public] artist read failed:", error);
    return null;
  }
}

/**
 * Canonical show ids that carry public content — any poster, photo,
 * memory, or ephemera item. Mirrors the public show database's bar for
 * "documented enough to appear."
 */
async function publicShowIds(db: Db): Promise<Set<string>> {
  const ids = new Set<string>();
  const collect = async (
    table:
      | typeof t.posters
      | typeof t.showPhotos
      | typeof t.memories
      | typeof t.ephemeraItems,
  ) => {
    // sql-wrapped column: the proven pattern for selecting across a table
    // union (see app/shows/page.tsx) — the raw union column doesn't
    // reliably satisfy drizzle's SelectedFields type.
    const rows = (await db
      .select({ showId: sql<string>`${table.showId}` })
      .from(table)
      .groupBy(table.showId)) as Array<{ showId: string | null }>;
    for (const row of rows) if (row.showId) ids.add(row.showId);
  };
  await Promise.all([
    collect(t.posters),
    collect(t.showPhotos),
    collect(t.memories),
    collect(t.ephemeraItems),
  ]);
  return ids;
}

export interface PublicArtistCard {
  id: string;
  name: string;
  hometown?: string;
  genres: string[];
  gradient: string;
  showCount: number;
}

/**
 * Artists in the public archive: anyone who headlines/performs a show
 * that has submitted content (a poster, photo, memory, or ephemera).
 * Viewer-independent, so logged-out visitors see the real database
 * rather than the seeded demo.
 */
export async function listPublicArtists(): Promise<PublicArtistCard[] | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const showIds = [...(await publicShowIds(db))];
    if (showIds.length === 0) return [];

    const shows = await db
      .select({ id: t.shows.id, artistId: t.shows.artistId })
      .from(t.shows)
      .where(inArray(t.shows.id, showIds));

    // Every performer on those shows counts, not just the headliner.
    const artistShowCount = new Map<string, Set<string>>();
    const bump = (artistId: string, showId: string) => {
      const set = artistShowCount.get(artistId) ?? new Set<string>();
      set.add(showId);
      artistShowCount.set(artistId, set);
    };
    for (const s of shows) bump(s.artistId, s.id);
    try {
      const bill = await db
        .select({
          showId: t.showPerformers.showId,
          artistId: t.showPerformers.artistId,
        })
        .from(t.showPerformers)
        .where(inArray(t.showPerformers.showId, showIds));
      for (const p of bill) bump(p.artistId, p.showId);
    } catch {
      // lineup table pending migration — headliners alone still populate
    }

    const artistIds = [...artistShowCount.keys()];
    if (artistIds.length === 0) return [];
    const rows = await db
      .select({
        id: t.artists.id,
        name: t.artists.name,
        hometown: t.artists.hometown,
        genres: t.artists.genres,
        gradient: t.artists.gradient,
      })
      .from(t.artists)
      .where(inArray(t.artists.id, artistIds));

    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        hometown: row.hometown ?? undefined,
        genres: row.genres ?? [],
        gradient: row.gradient ?? "midnight",
        showCount: artistShowCount.get(row.id)?.size ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn("[public] artist list failed:", error);
    return null;
  }
}

export interface PublicVenue {
  id: string;
  name: string;
  city: string;
  region?: string;
  country?: string;
  capacity?: number;
}

export interface PublicVenueCard extends PublicVenue {
  gradient: string;
  showCount: number;
}

/** Venues in the public archive: those hosting a documented show. */
export async function listPublicVenues(): Promise<PublicVenueCard[] | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const showIds = [...(await publicShowIds(db))];
    if (showIds.length === 0) return [];
    const shows = await db
      .select({ id: t.shows.id, venueId: t.shows.venueId })
      .from(t.shows)
      .where(inArray(t.shows.id, showIds));

    const venueShows = new Map<string, number>();
    for (const s of shows) {
      venueShows.set(s.venueId, (venueShows.get(s.venueId) ?? 0) + 1);
    }
    const venueIds = [...venueShows.keys()];
    if (venueIds.length === 0) return [];
    const rows = await db
      .select({
        id: t.venues.id,
        name: t.venues.name,
        city: t.venues.city,
        region: t.venues.region,
        country: t.venues.country,
        capacity: t.venues.capacity,
        gradient: t.venues.gradient,
      })
      .from(t.venues)
      .where(inArray(t.venues.id, venueIds));

    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        city: row.city,
        region: row.region ?? undefined,
        country: row.country ?? undefined,
        capacity: row.capacity ?? undefined,
        gradient: row.gradient ?? "midnight",
        showCount: venueShows.get(row.id) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn("[public] venue list failed:", error);
    return null;
  }
}

export async function getPublicVenue(id: string): Promise<PublicVenue | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const [row] = await db
      .select({
        id: t.venues.id,
        name: t.venues.name,
        city: t.venues.city,
        region: t.venues.region,
        country: t.venues.country,
        capacity: t.venues.capacity,
      })
      .from(t.venues)
      .where(eq(t.venues.id, id));
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      city: row.city,
      region: row.region ?? undefined,
      country: row.country ?? undefined,
      capacity: row.capacity ?? undefined,
    };
  } catch (error) {
    console.warn("[public] venue read failed:", error);
    return null;
  }
}

/** Every performer on a show (headliners first) — for lineup rendering. */
export const primaryHeadliners = (show: PublicShow): PublicPerformer[] =>
  show.performers.filter(
    (p) => p.billingRole === "headliner" || p.billingRole === "co_headliner",
  );

export interface PublicPoster {
  id: string;
  title: string;
  designer: string;
  year: number;
  imageUrl?: string;
  widthIn?: number;
  heightIn?: number;
  technique?: string;
  artistName?: string;
  venueName?: string;
  venueCity?: string;
  showDate?: string;
}

export interface PosterArtistCard {
  slug: string;
  name: string;
  posterCount: number;
  thumbs: string[];
  website?: string;
}

/** slug → website for poster artists that have one recorded. Best-effort:
 * returns an empty map if the poster_artist table isn't migrated yet. */
async function posterArtistWebsites(db: Db): Promise<Map<string, string>> {
  try {
    const rows = await db
      .select({ slug: t.posterArtists.slug, website: t.posterArtists.website })
      .from(t.posterArtists);
    return new Map(
      rows.filter((r) => r.website).map((r) => [r.slug, r.website as string]),
    );
  } catch {
    return new Map();
  }
}

/**
 * Poster artists (print designers) across the public archive. Designers
 * are free text on posters, so they're grouped by slug; "Unknown" and
 * blanks are excluded. Viewer-independent.
 */
export async function listPublicPosterArtists(): Promise<
  PosterArtistCard[] | null
> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select({ designer: t.posters.designer, imageUrl: t.posters.imageUrl })
      .from(t.posters)
      .limit(20000);
    const byslug = new Map<
      string,
      { name: string; count: number; thumbs: string[] }
    >();
    for (const row of rows) {
      const name = (row.designer ?? "").trim();
      if (!name || name.toLowerCase() === "unknown") continue;
      const slug = posterArtistSlug(name);
      if (!slug) continue;
      const entry = byslug.get(slug) ?? { name, count: 0, thumbs: [] };
      entry.count += 1;
      if (row.imageUrl && entry.thumbs.length < 4) entry.thumbs.push(row.imageUrl);
      byslug.set(slug, entry);
    }
    const websites = await posterArtistWebsites(db);
    return [...byslug.entries()]
      .map(([slug, e]) => ({
        slug,
        name: e.name,
        posterCount: e.count,
        thumbs: e.thumbs,
        website: websites.get(slug),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn("[public] poster-artist list failed:", error);
    return null;
  }
}

export interface PosterArtistWork {
  id: string;
  title: string;
  imageUrl?: string;
  year: number;
  artistName?: string;
  venueName?: string;
  showDate?: string;
}

export interface PosterArtistDetail {
  slug: string;
  name: string;
  works: PosterArtistWork[];
  years: string;
  website?: string;
}

/** The recorded website for a poster artist (by designer name), if any.
 * Best-effort — undefined when the poster_artist table isn't migrated. */
export async function getPosterArtistWebsite(
  name?: string,
): Promise<string | undefined> {
  const db = getDb();
  const clean = (name ?? "").trim();
  if (!db || !clean || clean.toLowerCase() === "unknown") return undefined;
  const slug = posterArtistSlug(clean);
  if (!slug) return undefined;
  try {
    const [row] = await db
      .select({ website: t.posterArtists.website })
      .from(t.posterArtists)
      .where(eq(t.posterArtists.slug, slug));
    return row?.website ?? undefined;
  } catch {
    return undefined;
  }
}

/** Every print by a poster artist (matched by slug), newest first. */
export async function getPosterArtistBySlug(
  slug: string,
): Promise<PosterArtistDetail | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select({
        id: t.posters.id,
        title: t.posters.title,
        designer: t.posters.designer,
        year: t.posters.year,
        imageUrl: t.posters.imageUrl,
        artistName: t.artists.name,
        venueName: t.venues.name,
        showDate: t.shows.date,
      })
      .from(t.posters)
      .leftJoin(t.shows, eq(t.posters.showId, t.shows.id))
      .leftJoin(t.artists, eq(t.shows.artistId, t.artists.id))
      .leftJoin(t.venues, eq(t.shows.venueId, t.venues.id))
      .limit(20000);

    const matches = rows.filter(
      (r) => r.designer && posterArtistSlug(r.designer) === slug,
    );
    if (matches.length === 0) return null;
    const name = matches[0].designer as string;
    const works = matches
      .map((r) => ({
        id: r.id,
        title: r.title,
        imageUrl: r.imageUrl ?? undefined,
        year: r.year,
        artistName: r.artistName ?? undefined,
        venueName: r.venueName ?? undefined,
        showDate: r.showDate ?? undefined,
      }))
      .sort((a, b) => b.year - a.year);
    const yearsList = works.map((w) => w.year).filter(Boolean);
    const years =
      yearsList.length === 0
        ? ""
        : Math.min(...yearsList) === Math.max(...yearsList)
          ? String(yearsList[0])
          : `${Math.min(...yearsList)}–${Math.max(...yearsList)}`;
    const website = await getPosterArtistWebsite(name);
    return { slug, name, works, years, website };
  } catch (error) {
    console.warn("[public] poster-artist detail failed:", error);
    return null;
  }
}

export interface PublicCollectionPoster {
  id: string;
  title: string;
  designer: string;
  year: number;
  imageUrl?: string;
  gradient: string;
}

export interface PublicCollection {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  posters: PublicCollectionPoster[];
}

/** A shareable, read-only view of a user's collection (anyone with the
 * link). Viewer-independent — no ownership check. */
export async function getPublicCollection(
  id: string,
): Promise<PublicCollection | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const [col] = await db
      .select({
        id: t.collections.id,
        name: t.collections.name,
        description: t.collections.description,
        ownerId: t.collections.userId,
        ownerName: t.users.name,
      })
      .from(t.collections)
      .innerJoin(t.users, eq(t.collections.userId, t.users.id))
      .where(eq(t.collections.id, id));
    if (!col) return null;

    let posters: PublicCollectionPoster[] = [];
    try {
      const rows = await db
        .select({
          id: t.posters.id,
          title: t.posters.title,
          designer: t.posters.designer,
          year: t.posters.year,
          imageUrl: t.posters.imageUrl,
          gradient: t.posters.gradient,
        })
        .from(t.collectionPosters)
        .innerJoin(t.posters, eq(t.collectionPosters.posterId, t.posters.id))
        .where(eq(t.collectionPosters.collectionId, id))
        .orderBy(desc(t.posters.year));
      posters = rows.map((r) => ({
        id: r.id,
        title: r.title,
        designer: r.designer,
        year: r.year,
        imageUrl: r.imageUrl ?? undefined,
        gradient: r.gradient ?? "midnight",
      }));
    } catch (error) {
      console.warn("[public] collection posters failed (migration pending?):", error);
    }

    return {
      id: col.id,
      name: col.name,
      description: col.description ?? "",
      ownerId: col.ownerId,
      ownerName: col.ownerName ?? "A collector",
      posters,
    };
  } catch (error) {
    console.warn("[public] collection failed:", error);
    return null;
  }
}

export async function getPublicPoster(id: string): Promise<PublicPoster | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const [row] = await db
      .select({
        id: t.posters.id,
        title: t.posters.title,
        designer: t.posters.designer,
        year: t.posters.year,
        imageUrl: t.posters.imageUrl,
        editions: t.posters.editions,
        artistName: t.artists.name,
        venueName: t.venues.name,
        venueCity: t.venues.city,
        showDate: t.shows.date,
      })
      .from(t.posters)
      .leftJoin(t.shows, eq(t.posters.showId, t.shows.id))
      .leftJoin(t.artists, eq(t.shows.artistId, t.artists.id))
      .leftJoin(t.venues, eq(t.shows.venueId, t.venues.id))
      .where(eq(t.posters.id, id));
    if (!row) return null;
    const edition = row.editions?.[0];
    return {
      id: row.id,
      title: row.title,
      designer: row.designer,
      year: row.year,
      imageUrl: row.imageUrl ?? undefined,
      widthIn: edition?.widthIn,
      heightIn: edition?.heightIn,
      technique: edition?.technique,
      artistName: row.artistName ?? undefined,
      venueName: row.venueName ?? undefined,
      venueCity: row.venueCity ?? undefined,
      showDate: row.showDate ?? undefined,
    };
  } catch (error) {
    console.warn("[public] poster read failed:", error);
    return null;
  }
}
