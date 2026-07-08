/**
 * Public Explore data: the world/database view of the archive, aggregated
 * across all collectors. Best-effort — returns null when the DB is absent
 * or a query fails, and the homepage falls back to the viewer's archive.
 */

import { desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import type { PosterState } from "@/lib/types";

export interface ExplorePoster {
  id: string;
  imageUrl: string;
  artistName?: string;
  venueName?: string;
  year: number;
  designer: string;
  state: PosterState;
}

export interface ExploreShow {
  id: string;
  date: string;
  gradient: string | null;
  artistName: string;
  venueName: string;
  venueCity: string;
  posterImage?: string;
  posterId?: string;
  artifacts: number;
}

export interface Posterography {
  artistId: string;
  artistName: string;
  posterCount: number;
  years: string;
  thumbs: string[];
  showsMissingPosters: number;
}

export interface ExploreVenue {
  venueId: string;
  name: string;
  city: string;
  showCount: number;
  posterCount: number;
}

export interface ExploreData {
  featured: ExplorePoster[];
  recentShows: ExploreShow[];
  posterographies: Posterography[];
  venues: ExploreVenue[];
  missing: {
    showsMissingPosters: number;
    postersMissingImages: number;
    postersMissingCredit: number;
    postersMissingEdition: number;
  };
}

export async function getExploreData(): Promise<ExploreData | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const countBy = async (
      table: typeof t.showPhotos | typeof t.memories | typeof t.ephemeraItems,
    ) => {
      const rows = await db
        .select({ showId: table.showId, n: sql<number>`count(*)` })
        .from(table)
        .groupBy(table.showId);
      return new Map(rows.map((r) => [r.showId, Number(r.n)]));
    };

    const [posterRows, showRows, photoCounts, memoryCounts, ephemeraCounts] =
      await Promise.all([
        db
          .select({
            id: t.posters.id,
            title: t.posters.title,
            designer: t.posters.designer,
            year: t.posters.year,
            imageUrl: t.posters.imageUrl,
            state: t.posters.state,
            owned: t.posters.owned,
            showId: t.posters.showId,
            editions: t.posters.editions,
            artistId: t.shows.artistId,
            artistName: t.artists.name,
            venueName: t.venues.name,
          })
          .from(t.posters)
          .leftJoin(t.shows, eq(t.posters.showId, t.shows.id))
          .leftJoin(t.artists, eq(t.shows.artistId, t.artists.id))
          .leftJoin(t.venues, eq(t.shows.venueId, t.venues.id)),
        db
          .select({
            id: t.shows.id,
            date: t.shows.date,
            gradient: t.shows.gradient,
            artistId: t.shows.artistId,
            artistName: t.artists.name,
            venueId: t.shows.venueId,
            venueName: t.venues.name,
            venueCity: t.venues.city,
          })
          .from(t.shows)
          .innerJoin(t.artists, eq(t.shows.artistId, t.artists.id))
          .innerJoin(t.venues, eq(t.shows.venueId, t.venues.id))
          .orderBy(desc(t.shows.date))
          .limit(400),
        countBy(t.showPhotos),
        countBy(t.memories),
        countBy(t.ephemeraItems),
      ]);

    const state = (p: { state: string | null; owned: boolean }): PosterState =>
      (p.state ?? (p.owned ? "own" : "want")) as PosterState;

    const postersByShow = new Map<string, typeof posterRows>();
    for (const p of posterRows) {
      if (!p.showId) continue;
      const list = postersByShow.get(p.showId) ?? [];
      list.push(p);
      postersByShow.set(p.showId, list);
    }

    // Featured: image-dominant, shuffled per request.
    const featured = posterRows
      .filter((p) => p.imageUrl)
      .map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl as string,
        artistName: p.artistName ?? undefined,
        venueName: p.venueName ?? undefined,
        year: p.year,
        designer: p.designer,
        state: state(p),
      }))
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);

    // Recently archived shows: newest shows that have any artifact.
    const recentShows: ExploreShow[] = showRows
      .map((s) => {
        const showPosters = postersByShow.get(s.id) ?? [];
        const withImage = showPosters.find((p) => p.imageUrl);
        const artifacts =
          showPosters.length +
          (photoCounts.get(s.id) ?? 0) +
          (memoryCounts.get(s.id) ?? 0) +
          (ephemeraCounts.get(s.id) ?? 0);
        return {
          id: s.id,
          date: s.date,
          gradient: s.gradient,
          artistName: s.artistName,
          venueName: s.venueName,
          venueCity: s.venueCity,
          posterImage: withImage?.imageUrl ?? undefined,
          posterId: withImage?.id,
          artifacts,
        };
      })
      .filter((s) => s.artifacts > 0)
      .slice(0, 4);

    // Posterographies: performers ranked by poster count.
    const byArtist = new Map<
      string,
      { name: string; years: number[]; thumbs: string[]; count: number; showIds: Set<string> }
    >();
    for (const p of posterRows) {
      if (!p.artistId || !p.artistName) continue;
      const entry =
        byArtist.get(p.artistId) ??
        { name: p.artistName, years: [], thumbs: [], count: 0, showIds: new Set<string>() };
      entry.count += 1;
      entry.years.push(p.year);
      if (p.imageUrl && entry.thumbs.length < 3) entry.thumbs.push(p.imageUrl);
      if (p.showId) entry.showIds.add(p.showId);
      byArtist.set(p.artistId, entry);
    }
    const showCountByArtist = new Map<string, number>();
    for (const s of showRows) {
      showCountByArtist.set(s.artistId, (showCountByArtist.get(s.artistId) ?? 0) + 1);
    }
    const posterographies: Posterography[] = [...byArtist.entries()]
      .map(([artistId, e]) => ({
        artistId,
        artistName: e.name,
        posterCount: e.count,
        years:
          Math.min(...e.years) === Math.max(...e.years)
            ? String(e.years[0])
            : `${Math.min(...e.years)}–${Math.max(...e.years)}`,
        thumbs: e.thumbs,
        showsMissingPosters: Math.max(
          0,
          (showCountByArtist.get(artistId) ?? 0) - e.showIds.size,
        ),
      }))
      .sort((a, b) => b.posterCount - a.posterCount)
      .slice(0, 4);

    // Iconic venues: most-documented rooms.
    const byVenue = new Map<string, ExploreVenue>();
    for (const s of showRows) {
      const entry =
        byVenue.get(s.venueId) ??
        { venueId: s.venueId, name: s.venueName, city: s.venueCity, showCount: 0, posterCount: 0 };
      entry.showCount += 1;
      entry.posterCount += postersByShow.get(s.id)?.length ?? 0;
      byVenue.set(s.venueId, entry);
    }
    const venues = [...byVenue.values()]
      .sort((a, b) => b.showCount - a.showCount)
      .slice(0, 4);

    const showsWithPosters = new Set(postersByShow.keys());
    const missing = {
      showsMissingPosters: showRows.filter((s) => !showsWithPosters.has(s.id)).length,
      postersMissingImages: posterRows.filter((p) => !p.imageUrl).length,
      postersMissingCredit: posterRows.filter(
        (p) => !p.designer || p.designer === "Unknown",
      ).length,
      postersMissingEdition: posterRows.filter(
        (p) => !(p.editions ?? [])[0]?.runSize,
      ).length,
    };

    return { featured, recentShows, posterographies, venues, missing };
  } catch (error) {
    console.warn("[explore] query failed:", error);
    return null;
  }
}
