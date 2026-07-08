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
import { showTitle, supportsOf } from "@/lib/billing";
import type {
  Artist,
  BillingRole,
  Collection,
  EphemeraItem,
  EphemeraKind,
  EventType,
  GradientKey,
  MediaLink,
  MediaLinkKind,
  Poster,
  PosterState,
  Show,
  ShowPerformer,
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

/**
 * Run one archive query, degrading to [] on failure (e.g. an unapplied
 * column migration) so a single broken table never demotes the whole
 * signed-in archive to demo data.
 */
async function safeRows<T>(query: PromiseLike<T[]>, label: string): Promise<T[]> {
  try {
    return await query;
  } catch (error) {
    console.warn(`[archive] ${label} query failed (migration pending?):`, error);
    return [];
  }
}

async function loadUserArchive(userId: string): Promise<ArchiveData> {
  const db = getDb();
  if (!db) return demoArchive();

  // Core spine — if these fail, the caller falls back to demo mode.
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

  // Show rows: try the full schema first; if a column migration hasn't
  // been applied yet, retry with the original column set so the archive
  // NEVER demotes to demo just because a deploy is ahead of the DB.
  interface ShowRow {
    id: string;
    artistId: string;
    venueId: string;
    tourId: string | null;
    name: string | null;
    date: string;
    endDate: string | null;
    eventType: string | null;
    stage: string | null;
    festivalId: string | null;
    showTime: string | null;
    gradient: string | null;
    setlistFmId: string | null;
    setlistFmUrl: string | null;
  }
  let showRows: ShowRow[] = [];
  if (showIds.length) {
    try {
      showRows = await db
        .select()
        .from(t.shows)
        .where(inArray(t.shows.id, showIds));
    } catch (error) {
      console.warn(
        "[archive] full show query failed (migration pending?) — retrying with legacy columns:",
        error,
      );
      const legacy = await db
        .select({
          id: t.shows.id,
          artistId: t.shows.artistId,
          venueId: t.shows.venueId,
          tourId: t.shows.tourId,
          date: t.shows.date,
          showTime: t.shows.showTime,
          gradient: t.shows.gradient,
          setlistFmId: t.shows.setlistFmId,
          setlistFmUrl: t.shows.setlistFmUrl,
        })
        .from(t.shows)
        .where(inArray(t.shows.id, showIds));
      showRows = legacy.map((row) => ({
        ...row,
        name: null,
        endDate: null,
        eventType: "concert",
        stage: null,
        festivalId: null,
      }));
    }
  }

  // Lineups load before artists so every performer on a bill lands in the
  // artist list (and gets a page) alongside headliners.
  const performerRows = showIds.length
    ? await safeRows(
        db
          .select()
          .from(t.showPerformers)
          .where(inArray(t.showPerformers.showId, showIds)),
        "lineups",
      )
    : [];
  const performersByShow = new Map<string, ShowPerformer[]>();
  for (const row of [...performerRows].sort(
    (a, b) => a.billingOrder - b.billingOrder,
  )) {
    const list = performersByShow.get(row.showId) ?? [];
    list.push({
      artistId: row.artistId,
      billingRole: row.billingRole as BillingRole,
      billingOrder: row.billingOrder,
      stage: row.stage ?? undefined,
      setTime: row.setTime ?? undefined,
      setlistFmId: row.setlistFmId ?? undefined,
      setlistFmUrl: row.setlistFmUrl ?? undefined,
    });
    performersByShow.set(row.showId, list);
  }

  const artistIds = [
    ...new Set([
      ...showRows.map((s) => s.artistId),
      ...performerRows.map((p) => p.artistId),
    ]),
  ];
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
      ? safeRows(
          db.select().from(t.artists).where(inArray(t.artists.id, artistIds)),
          "artists",
        )
      : Promise.resolve([]),
    venueIds.length
      ? safeRows(
          db.select().from(t.venues).where(inArray(t.venues.id, venueIds)),
          "venues",
        )
      : Promise.resolve([]),
    tourIds.length
      ? safeRows(
          db.select().from(t.tours).where(inArray(t.tours.id, tourIds)),
          "tours",
        )
      : Promise.resolve([]),
    safeRows(
      db.select().from(t.posters).where(eq(t.posters.userId, userId)),
      "posters",
    ),
    safeRows(
      db
        .select()
        .from(t.ephemeraItems)
        .where(eq(t.ephemeraItems.userId, userId)),
      "ephemera",
    ),
    safeRows(
      db.select().from(t.memories).where(eq(t.memories.userId, userId)),
      "memories",
    ),
    safeRows(
      db.select().from(t.mediaLinks).where(eq(t.mediaLinks.userId, userId)),
      "media links",
    ),
    safeRows(
      db.select().from(t.showPhotos).where(eq(t.showPhotos.userId, userId)),
      "photos",
    ),
    safeRows(
      db.select().from(t.collections).where(eq(t.collections.userId, userId)),
      "collections",
    ),
  ]);

  return {
    demo: false,
    userId,
    shows: showRows.map((row) => ({
      id: row.id,
      artistId: row.artistId,
      venueId: row.venueId,
      performers: performersByShow.get(row.id),
      name: row.name ?? undefined,
      eventType: (row.eventType ?? "concert") as EventType,
      festivalId: row.festivalId ?? undefined,
      stage: row.stage ?? undefined,
      tourId: row.tourId ?? undefined,
      date: row.date,
      endDate: row.endDate ?? undefined,
      showTime: row.showTime ?? undefined,
      attended: flags.get(row.id)?.attended ?? true,
      favorite: flags.get(row.id)?.favorite ?? false,
      gradient: g(row.gradient),
      setlistFmId: row.setlistFmId ?? undefined,
      setlistFmUrl: row.setlistFmUrl ?? undefined,
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
/** Shows where the artist appears anywhere on the bill. */
export const showsByArtist = (a: ArchiveData, artistId: string) =>
  allShows(a).filter(
    (s) =>
      s.artistId === artistId ||
      (s.performers ?? []).some((p) => p.artistId === artistId),
  );

/** Display title for a show, resolved against this archive's artists. */
export const showTitleFor = (a: ArchiveData, show: Show): string =>
  showTitle(show, (id) => findArtist(a, id)?.name);

/** The full bill with artist records attached, in billing order. */
export const lineupFor = (
  a: ArchiveData,
  show: Show,
): Array<{ artist: Artist; performer: ShowPerformer }> => {
  const performers =
    show.performers && show.performers.length > 0
      ? [...show.performers].sort((x, y) => x.billingOrder - y.billingOrder)
      : [
          {
            artistId: show.artistId,
            billingRole: "headliner" as BillingRole,
            billingOrder: 1,
          },
        ];
  return performers.flatMap((performer) => {
    const artist = findArtist(a, performer.artistId);
    return artist ? [{ artist, performer }] : [];
  });
};

/** Support/opener/special-guest acts on a show's bill, in billing order. */
export const openersForShow = (a: ArchiveData, show: Show) =>
  supportsOf(show)
    .map((p) => findArtist(a, p.artistId))
    .filter((x): x is Artist => Boolean(x));
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
