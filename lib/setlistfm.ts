/**
 * setlist.fm integration (server-side only).
 *
 * Looks up real setlists by artist name + show date via the setlist.fm REST
 * API (https://api.setlist.fm/docs/1.0/index.html) and normalizes them into
 * our `Setlist` type. Every entry point degrades gracefully: no API key, a
 * network failure, or an empty result all fall back to the locally seeded
 * setlist, so pages never break.
 *
 * Requires SETLISTFM_API_KEY in the environment (.env.local locally,
 * Project Settings → Environment Variables on Vercel). The key is only read
 * here, in server code — never expose it with a NEXT_PUBLIC_ prefix.
 */

import type { Setlist, SetlistSet, Show } from "./types";

const API_BASE = "https://api.setlist.fm/rest/1.0";
/** Re-fetch from setlist.fm at most once a day; setlists rarely change. */
const REVALIDATE_SECONDS = 60 * 60 * 24;

/* ---- Raw API shapes (the subset we consume) ---- */

interface SfmSong {
  name: string;
  info?: string;
  cover?: { name?: string };
}

interface SfmSet {
  name?: string;
  encore?: number;
  song?: SfmSong[];
}

interface SfmCity {
  name?: string;
  state?: string;
  stateCode?: string;
  country?: { code?: string; name?: string };
}

interface SfmSetlist {
  id: string;
  eventDate: string; // "14-09-2022"
  url?: string;
  artist?: { name?: string; mbid?: string };
  venue?: { name?: string; city?: SfmCity };
  tour?: { name?: string };
  sets?: { set?: SfmSet[] };
}

interface SfmSearchResponse {
  setlist?: SfmSetlist[];
}

interface SfmAttendedResponse {
  setlist?: SfmSetlist[];
  total?: number;
  page?: number;
  itemsPerPage?: number;
}

/* ---- Helpers ---- */

/** "2022-09-14" (ours) -> "14-09-2022" (setlist.fm's search format). */
function toSetlistFmDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year}`;
}

/** "14-09-2022" (setlist.fm) -> "2022-09-14" (ours). */
function fromSetlistFmDate(eventDate: string): string {
  const [day, month, year] = eventDate.split("-");
  return `${year}-${month}-${day}`;
}

function normalizeSets(raw: SfmSet[]): SetlistSet[] {
  const sets: SetlistSet[] = [];
  raw.forEach((set, index) => {
    const songs = (set.song ?? [])
      .filter((s) => s.name && s.name.trim().length > 0)
      .map((s) => ({
        title: s.name,
        coverOf: s.cover?.name,
        note: s.info,
      }));
    if (songs.length === 0) return;
    const name =
      set.encore != null
        ? "Encore"
        : (set.name ?? (index === 0 ? "Main Set" : `Set ${index + 1}`));
    sets.push({ name, songs });
  });
  return sets;
}

function normalizeSetlist(raw: SfmSetlist, showId: string): Setlist | undefined {
  const sets = normalizeSets(raw.sets?.set ?? []);
  if (sets.length === 0) return undefined; // empty shell entry on setlist.fm
  return {
    id: `setlistfm-${raw.id}`,
    showId,
    sets,
    source: "setlist.fm",
    sourceUrl: raw.url,
  };
}

/**
 * Extract the setlist id from a setlist.fm setlist URL, e.g.
 * https://www.setlist.fm/setlist/rilo-kiley/2025/greek-theatre-berkeley-ca-63521c73.html
 * -> "63521c73". Returns undefined for anything that doesn't look right.
 */
export function parseSetlistFmUrl(url: string): string | undefined {
  const match = url
    .trim()
    .match(/setlist\.fm\/setlist\/.*-([0-9a-z]+)\.html(?:[?#].*)?$/i);
  return match?.[1];
}

/** A lightweight match preview for the stepped add-show flow. */
export interface SetlistPreview {
  setlistFmId: string;
  url?: string;
  artistName: string;
  venueName?: string;
  city?: string;
  region?: string;
  country?: string;
  tourName?: string;
  songCount: number;
  /** ISO date. */
  date: string;
}

/**
 * Best setlist.fm match for an artist on a date — used to auto-confirm a
 * show and pre-fill venue/tour/setlist in the add-show wizard. Prefers a
 * result that actually has songs. Returns null when the key is missing,
 * the API fails, or nothing matches.
 */
export async function lookupSetlistPreview(
  artistName: string,
  isoDate: string,
): Promise<SetlistPreview | null> {
  try {
    const results = await searchSetlists(artistName, isoDate);
    if (results.length === 0) return null;
    const withSongs = results.find(
      (r) => (r.sets?.set ?? []).some((s) => (s.song?.length ?? 0) > 0),
    );
    const raw = withSongs ?? results[0];
    const city = raw.venue?.city;
    return {
      setlistFmId: raw.id,
      url: raw.url,
      artistName: raw.artist?.name ?? artistName,
      venueName: raw.venue?.name,
      city: city?.name,
      region: city?.stateCode ?? city?.state,
      country: city?.country?.name,
      tourName: raw.tour?.name,
      songCount: (raw.sets?.set ?? []).reduce(
        (n, set) => n + (set.song?.length ?? 0),
        0,
      ),
      date: fromSetlistFmDate(raw.eventDate),
    };
  } catch (error) {
    console.warn(`[setlistfm] preview lookup failed for "${artistName}":`, error);
    return null;
  }
}

/* ---- Fetching ---- */

async function searchSetlists(
  artistName: string,
  isoDate: string,
): Promise<SfmSetlist[]> {
  const apiKey = process.env.SETLISTFM_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    artistName,
    date: toSetlistFmDate(isoDate),
    p: "1",
  });

  const res = await fetch(`${API_BASE}/search/setlists?${params}`, {
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  // 404 = no setlists match this artist + date; anything else non-OK is
  // unexpected (bad key = 403, rate limit = 429) but never fatal here.
  if (!res.ok) {
    if (res.status !== 404) {
      console.warn(
        `[setlistfm] search failed for "${artistName}" ${isoDate}: HTTP ${res.status}`,
      );
    }
    return [];
  }

  const data = (await res.json()) as SfmSearchResponse;
  return data.setlist ?? [];
}

/**
 * Fetch one setlist by its setlist.fm id
 * (GET /rest/1.0/setlist/{setlistId}) — used when a show has been
 * explicitly linked to a setlist, which beats the name+date search.
 */
async function fetchSetlistById(
  setlistFmId: string,
  showId: string,
): Promise<Setlist | undefined> {
  const apiKey = process.env.SETLISTFM_API_KEY;
  if (!apiKey) return undefined;

  const res = await fetch(
    `${API_BASE}/setlist/${encodeURIComponent(setlistFmId)}`,
    {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    },
  );
  if (!res.ok) {
    if (res.status !== 404) {
      console.warn(
        `[setlistfm] setlist ${setlistFmId} fetch failed: HTTP ${res.status}`,
      );
    }
    return undefined;
  }
  const raw = (await res.json()) as SfmSetlist;
  return normalizeSetlist(raw, showId);
}

/* ---- Profile import (attended shows) ---- */

/** A show pulled from a setlist.fm user's attendance history. */
export interface ImportedShow {
  /** setlist.fm setlist id — stable key for dedupe on import. */
  setlistFmId: string;
  artistName: string;
  venueName: string;
  city: string;
  region?: string;
  country?: string;
  /** ISO date. */
  date: string;
  tourName?: string;
  songCount: number;
  url?: string;
}

export type AttendedResult =
  | {
      ok: true;
      shows: ImportedShow[];
      total: number;
      page: number;
      itemsPerPage: number;
    }
  | { ok: false; error: string };

function normalizeImportedShow(raw: SfmSetlist): ImportedShow {
  const city = raw.venue?.city;
  return {
    setlistFmId: raw.id,
    artistName: raw.artist?.name ?? "Unknown artist",
    venueName: raw.venue?.name ?? "Unknown venue",
    city: city?.name ?? "",
    region: city?.stateCode ?? city?.state,
    country: city?.country?.name,
    date: fromSetlistFmDate(raw.eventDate),
    tourName: raw.tour?.name,
    songCount: (raw.sets?.set ?? []).reduce(
      (n, set) => n + (set.song?.length ?? 0),
      0,
    ),
    url: raw.url,
  };
}

/**
 * Fetch a page of shows a setlist.fm user has marked as attended
 * (GET /rest/1.0/user/{userId}/attended).
 *
 * TODO(persistence): once real storage exists, map these into Show /
 * Artist / Venue rows (keyed by setlistFmId for dedupe) instead of only
 * previewing them — see app/import/page.tsx.
 */
export async function fetchAttendedShows(
  userId: string,
  page = 1,
): Promise<AttendedResult> {
  const apiKey = process.env.SETLISTFM_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "SETLISTFM_API_KEY is not configured. Add it to .env.local (and your Vercel environment variables) to enable imports.",
    };
  }

  try {
    const res = await fetch(
      `${API_BASE}/user/${encodeURIComponent(userId)}/attended?p=${page}`,
      {
        headers: { "x-api-key": apiKey, Accept: "application/json" },
        // Personal, frequently-changing data — don't cache.
        cache: "no-store",
      },
    );

    if (res.status === 404) {
      return {
        ok: false,
        error: `No setlist.fm user "${userId}" found (or they have no attended shows).`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: `setlist.fm returned HTTP ${res.status}. Try again in a moment.`,
      };
    }

    const data = (await res.json()) as SfmAttendedResponse;
    return {
      ok: true,
      shows: (data.setlist ?? []).map(normalizeImportedShow),
      total: data.total ?? data.setlist?.length ?? 0,
      page: data.page ?? page,
      itemsPerPage: data.itemsPerPage ?? 20,
    };
  } catch (error) {
    console.warn(`[setlistfm] attended fetch failed for ${userId}:`, error);
    return {
      ok: false,
      error: "Couldn't reach setlist.fm. Check your connection and try again.",
    };
  }
}

/**
 * The setlist a show page should render: the live setlist.fm version when
 * available, otherwise the provided fallback (a seeded setlist in demo mode,
 * undefined for user archives — which renders the empty state).
 */
export async function resolveSetlist(
  show: Show,
  artistName: string | undefined,
  fallback?: Setlist,
): Promise<Setlist | undefined> {
  // An explicitly linked setlist (pasted URL on add/edit show) wins over
  // the artist-name + date search.
  if (show.setlistFmId) {
    try {
      const linked = await fetchSetlistById(show.setlistFmId, show.id);
      if (linked) return linked;
    } catch (error) {
      console.warn(`[setlistfm] linked fetch failed for show ${show.id}:`, error);
    }
  }
  if (!artistName) return fallback;

  try {
    const results = await searchSetlists(artistName, show.date);
    for (const raw of results) {
      const normalized = normalizeSetlist(raw, show.id);
      if (normalized) return normalized;
    }
  } catch (error) {
    console.warn(`[setlistfm] lookup failed for show ${show.id}:`, error);
  }
  return fallback;
}
