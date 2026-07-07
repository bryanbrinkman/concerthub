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
import { getArtist, getSetlistForShow } from "./data";

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

interface SfmSetlist {
  id: string;
  eventDate: string; // "14-09-2022"
  url?: string;
  venue?: { name?: string; city?: { name?: string } };
  sets?: { set?: SfmSet[] };
}

interface SfmSearchResponse {
  setlist?: SfmSetlist[];
}

/* ---- Helpers ---- */

/** "2022-09-14" (ours) -> "14-09-2022" (setlist.fm's search format). */
function toSetlistFmDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year}`;
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
 * The setlist a show page should render: the live setlist.fm version when
 * available, otherwise whatever is seeded locally.
 */
export async function resolveSetlist(show: Show): Promise<Setlist | undefined> {
  const seeded = getSetlistForShow(show.id);
  const artist = getArtist(show.artistId);
  if (!artist) return seeded;

  try {
    const results = await searchSetlists(artist.name, show.date);
    for (const raw of results) {
      const normalized = normalizeSetlist(raw, show.id);
      if (normalized) return normalized;
    }
  } catch (error) {
    console.warn(`[setlistfm] lookup failed for show ${show.id}:`, error);
  }
  return seeded;
}
