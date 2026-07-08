/**
 * Archive data layer.
 *
 * `getArchive()` returns everything the UI needs for the current viewer:
 *  - Signed in (auth + DB configured): their own rows from Postgres.
 *  - Signed out / auth not configured: the read-only demo archive seeded in
 *    lib/data.ts.
 *
 * The result is a plain serializable bundle; the pure finder helpers below
 * replace the old synchronous lookups in lib/data.ts. Wrapped in
 * React.cache so layout + page share one fetch per request.
 */

import { cache } from "react";
import { eq, inArray } from "drizzle-orm";

import { authEnabled, currentUserId } from "@/auth";
import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import * as seed from "@/lib/data";
import type {
  Artist,
  Collection,
  EphemeraItem,
  EphemeraKind,
  GradientKey,
  MediaLink,
  MediaLinkKind,
  Poster,
  PosterState,
  Show,
  ShowPhoto,
  Tour,
  UserMemory,
  Venue,
} from "@/lib/types";

export interface ArchiveData {
  /** True when serving the seeded demo archive (viewer not signed in). */
  demo: boolean;
  userId?: string;
  shows: Show[];
  artists: Artist[];
  venues: Venue[];
  tours: Tour[];
  posters: Poster[];
  ephemera: EphemeraItem[];
  memories: UserMemory[];
  mediaLinks: MediaLink[];
  photos: ShowPhoto[];
  collections: Collection[];
}

const g = (value: string | null | undefined): GradientKey =>
  (value ?? "midnight") as GradientKey;

function demoArchive(): ArchiveData {
  return {
    demo: true,
    shows: seed.shows,
    artists: seed.artists,
    venues: seed.venues,
    tours: seed.tours,
    posters: seed.posters,
    ephemera: seed.ephemera,
    memories: seed.memories,
    mediaLinks: seed.mediaLinks,
    photos: seed.showPhotos,
    collections: seed.collections,
  };
}

async function loadUserArchive(userId: string): Promise<ArchiveData> {
  const db = getDb();
  if (!db) return demoArchive();

  const userShowRows = await db
    .select()
    .from(t.userShows)
    .where(eq(t.userShows.userId, userId));
  const flags = new Map(
    userShowRows.map((r) => [
      r.showId,
      { attended: r.attended, favorite: r.favorite },
    ]),
  );
  const showIds = userShowRows.map((r) => r.showId);

  const showRows = showIds.length
    ? await db.select().from(t.shows).where(inArray(t.shows.id, showIds))
    : [];

  const artistIds = [...new Set(showRows.map((s) => s.artistId))];
  const venueIds = [...new Set(showRows.map((s) => s.venueId))];
  const tourIds = [
    ...new Set(showRows.map((s) => s.tourId).filter((x): x is string => !!x)),
  ];

  const [
    artistRows,
    venueRows,
    tourRows,
    posterRows,
    ephemeraRows,
    memoryRows,
    mediaRows,
    photoRows,
    collectionRows,
  ] = await Promise.all([
    artistIds.length
      ? db.select().from(t.artists).where(inArray(t.artists.id, artistIds))
      : Promise.resolve([]),
    venueIds.length
      ? db.select().from(t.venues).where(inArray(t.venues.id, venueIds))
      : Promise.resolve([]),
    tourIds.length
      ? db.select().from(t.tours).where(inArray(t.tours.id, tourIds))
      : Promise.resolve([]),
    db.select().from(t.posters).where(eq(t.posters.userId, userId)),
    db
      .select()
      .from(t.ephemeraItems)
      .where(eq(t.ephemeraItems.userId, userId)),
    db.select().from(t.memories).where(eq(t.memories.userId, userId)),
    db.select().from(t.mediaLinks).where(eq(t.mediaLinks.userId, userId)),
    db.select().from(t.showPhotos).where(eq(t.showPhotos.userId, userId)),
    db.select().from(t.collections).where(eq(t.collections.userId, userId)),
  ]);

  return {
    demo: false,
    userId,
    shows: showRows.map((row) => ({
      id: row.id,
      artistId: row.artistId,
      venueId: row.venueId,
      tourId: row.tourId ?? undefined,
      date: row.date,
      showTime: row.showTime ?? undefined,
      attended: flags.get(row.id)?.attended ?? true,
      favorite: flags.get(row.id)?.favorite ?? false,
      gradient: g(row.gradient),
    })),
    artists: artistRows.map((row) => ({
      id: row.id,
      name: row.name,
      genres: row.genres ?? [],
      hometown: row.hometown ?? undefined,
      gradient: g(row.gradient),
      setlistFmMbid: row.setlistFmMbid ?? undefined,
    })),
    venues: venueRows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      region: row.region ?? undefined,
      country: row.country ?? "",
      capacity: row.capacity ?? undefined,
      gradient: g(row.gradient),
    })),
    tours: tourRows.map((row) => ({
      id: row.id,
      artistId: row.artistId,
      name: row.name,
      years: row.years,
    })),
    posters: posterRows.map((row) => ({
      id: row.id,
      showId: row.showId ?? undefined,
      tourId: row.tourId ?? undefined,
      title: row.title,
      designer: row.designer,
      year: row.year,
      notes: row.notes ?? undefined,
      gradient: g(row.gradient),
      owned: row.owned,
      state: (row.state ?? (row.owned ? "own" : "want")) as PosterState,
      imageUrl: row.imageUrl ?? undefined,
      imageUrls: row.imageUrls ?? undefined,
      expressoBeansId: row.expressoBeansId ?? undefined,
      editions: row.editions ?? [],
    })),
    ephemera: ephemeraRows.map((row) => ({
      id: row.id,
      showId: row.showId,
      kind: row.kind as EphemeraKind,
      title: row.title,
      detail: row.detail ?? undefined,
      gradient: g(row.gradient),
      imageUrl: row.imageUrl ?? undefined,
    })),
    memories: memoryRows.map((row) => ({
      id: row.id,
      showId: row.showId,
      text: row.text,
      createdAt: row.createdAt.toISOString().slice(0, 10),
      attendedWith: row.attendedWith ?? undefined,
    })),
    mediaLinks: mediaRows.map((row) => ({
      id: row.id,
      showId: row.showId,
      kind: row.kind as MediaLinkKind,
      label: row.label,
      sublabel: row.sublabel ?? undefined,
      duration: row.duration ?? undefined,
      url: row.url,
    })),
    photos: photoRows.map((row) => ({
      id: row.id,
      showId: row.showId,
      caption: row.caption,
      gradient: g(row.gradient),
      imageUrl: row.imageUrl ?? undefined,
    })),
    collections: collectionRows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      itemCount: row.itemCount,
      gradient: g(row.gradient),
    })),
  };
}

/** The current viewer's archive (their own if signed in, demo otherwise). */
export const getArchive = cache(async (): Promise<ArchiveData> => {
  if (!authEnabled) return demoArchive();
  try {
    const userId = await currentUserId();
    if (!userId) return demoArchive();
    return await loadUserArchive(userId);
  } catch (error) {
    console.warn("[archive] falling back to demo archive:", error);
    return demoArchive();
  }
});

/* ------------------------------------------------------------------ */
/* Pure finders over an archive bundle                                 */
/* ------------------------------------------------------------------ */

export const findArtist = (a: ArchiveData, id: string) =>
  a.artists.find((x) => x.id === id);
export const findVenue = (a: ArchiveData, id: string) =>
  a.venues.find((x) => x.id === id);
export const findTour = (a: ArchiveData, id: string) =>
  a.tours.find((x) => x.id === id);
export const findShow = (a: ArchiveData, id: string) =>
  a.shows.find((x) => x.id === id);

export const allShows = (a: ArchiveData) =>
  [...a.shows].sort((x, y) => y.date.localeCompare(x.date));

export const postersForShow = (a: ArchiveData, showId: string) =>
  a.posters.filter((p) => p.showId === showId);
export const ephemeraForShow = (a: ArchiveData, showId: string) =>
  a.ephemera.filter((e) => e.showId === showId);
export const memoryForShow = (a: ArchiveData, showId: string) =>
  a.memories.find((m) => m.showId === showId);
export const mediaLinksForShow = (a: ArchiveData, showId: string) =>
  a.mediaLinks.filter((m) => m.showId === showId);
export const photosForShow = (a: ArchiveData, showId: string) =>
  a.photos.filter((p) => p.showId === showId);
export const showsForTour = (a: ArchiveData, tourId: string) =>
  a.shows
    .filter((s) => s.tourId === tourId)
    .sort((x, y) => x.date.localeCompare(y.date));
export const showsByArtist = (a: ArchiveData, artistId: string) =>
  allShows(a).filter((s) => s.artistId === artistId);
export const showsByVenue = (a: ArchiveData, venueId: string) =>
  allShows(a).filter((s) => s.venueId === venueId);

export const posterState = (p: Poster): PosterState =>
  p.state ?? (p.owned ? "own" : "want");

export function archiveCounts(a: ArchiveData) {
  return {
    shows: a.shows.filter((s) => s.attended).length,
    wishlist: a.posters.filter((p) => posterState(p) === "want").length,
    posters:
      a.posters.filter((p) => p.owned).length +
      a.ephemera.filter((e) => e.kind === "poster").length,
    tickets: a.ephemera.filter((e) => e.kind === "ticket").length,
    merch: a.ephemera.filter(
      (e) => e.kind === "apparel" || e.kind === "other",
    ).length,
    favorites: a.shows.filter((s) => s.favorite).length,
  };
}

export type ArchiveCounts = ReturnType<typeof archiveCounts>;

/** Deterministic gradient for imported entities without artwork. */
const GRADIENT_KEYS: GradientKey[] = [
  "aurora",
  "dusk",
  "ember",
  "ocean",
  "jade",
  "gold",
  "midnight",
  "neon",
];

export function gradientFor(seedString: string): GradientKey {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash * 31 + seedString.charCodeAt(i)) | 0;
  }
  return GRADIENT_KEYS[Math.abs(hash) % GRADIENT_KEYS.length];
}
