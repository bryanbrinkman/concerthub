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

import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
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

export interface PublicVenue {
  id: string;
  name: string;
  city: string;
  region?: string;
  country?: string;
  capacity?: number;
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
