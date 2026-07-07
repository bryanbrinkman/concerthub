/**
 * Concert Collect — local seed data.
 *
 * Seeded with real shows from the user's archive. Setlists resolve live from
 * setlist.fm at runtime (lib/setlistfm.ts) — the setlist here is only the
 * offline fallback. Poster imagery can also resolve from Expresso Beans
 * (lib/expressobeans.ts) once an item id is set.
 *
 * The helper functions at the bottom are the read API the UI is built
 * against — swap seed arrays for real storage without touching pages.
 */

import type {
  Artist,
  Collection,
  EphemeraItem,
  GradientKey,
  MediaLink,
  Poster,
  Setlist,
  Show,
  Tour,
  UserMemory,
  Venue,
} from "./types";

/* ------------------------------------------------------------------ */
/* Artists                                                             */
/* ------------------------------------------------------------------ */

export const artists: Artist[] = [
  {
    id: "rilo-kiley",
    name: "Rilo Kiley",
    genres: ["Indie Rock", "Indie Pop"],
    hometown: "Los Angeles, CA",
    gradient: "ember",
  },
];

/* ------------------------------------------------------------------ */
/* Venues                                                              */
/* ------------------------------------------------------------------ */

export const venues: Venue[] = [
  {
    id: "capitol-theatre",
    name: "The Capitol Theatre",
    city: "Port Chester",
    region: "NY",
    country: "USA",
    capacity: 1800,
    gradient: "dusk",
  },
];

/* ------------------------------------------------------------------ */
/* Tours                                                               */
/* ------------------------------------------------------------------ */

export const tours: Tour[] = [
  {
    id: "rk-2025-tour",
    artistId: "rilo-kiley",
    name: "Sometimes When You're On You're Really F**king On Tour",
    years: "2025",
  },
];

/* ------------------------------------------------------------------ */
/* Shows                                                               */
/* ------------------------------------------------------------------ */

export const shows: Show[] = [
  {
    id: "rilo-kiley-capitol-2025",
    artistId: "rilo-kiley",
    venueId: "capitol-theatre",
    tourId: "rk-2025-tour",
    date: "2025-08-31",
    showTime: "8:00 PM",
    attended: true,
    favorite: true,
    gradient: "ember",
  },
];

/* ------------------------------------------------------------------ */
/* Setlists                                                            */
/* ------------------------------------------------------------------ */

// OFFLINE FALLBACK ONLY — approximated from 2025 reunion-tour setlists.
// With SETLISTFM_API_KEY set, lib/setlistfm.ts fetches the real setlist for
// 2025-08-31 and this seed is never shown.
export const setlists: Setlist[] = [
  {
    id: "setlist-rk-capitol-2025",
    showId: "rilo-kiley-capitol-2025",
    source: "setlist.fm",
    sourceUrl:
      "https://www.setlist.fm/setlist/rilo-kiley/2025/capitol-theatre-port-chester-ny-2347a073.html",
    sets: [
      {
        name: "Main Set",
        songs: [
          { title: "It's a Hit" },
          { title: "Close Call" },
          { title: "Paint's Peeling" },
          { title: "The Execution of All Things" },
          { title: "Dreamworld" },
          { title: "Ripchord" },
          { title: "The Good That Won't Come Out" },
          { title: "Glendora" },
          { title: "A Man/Me/Then Jim" },
          { title: "Wires and Waves" },
          { title: "I Never" },
          { title: "Silver Lining" },
          { title: "Breakin' Up" },
          { title: "The Moneymaker" },
          { title: "Portions for Foxes" },
          { title: "Spectacular Views" },
        ],
      },
      {
        name: "Encore",
        songs: [
          { title: "A Better Son/Daughter" },
          { title: "Does He Love You?" },
          { title: "With Arms Outstretched" },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Posters                                                             */
/* ------------------------------------------------------------------ */

// To pull imagery/deep links from Expresso Beans instead, set
// `expressoBeansId` from the item page URL
// (expressobeans.com/public/detail.php/<id>) — a hand-set imageUrl wins.
export const posters: Poster[] = [
  {
    id: "poster-rk-capitol-2025",
    showId: "rilo-kiley-capitol-2025",
    tourId: "rk-2025-tour",
    title: "The Capitol Theatre",
    designer: "Unknown",
    year: 2025,
    notes: "Show poster — Port Chester, Aug 31, 2025",
    gradient: "ember",
    owned: true,
    imageUrl:
      "https://res.cloudinary.com/dto3ky70u/image/upload/v1783451871/images_hid8br.jpg",
    editions: [
      {
        id: "ed-rk-capitol-reg",
        name: "Regular",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Ephemera                                                            */
/* ------------------------------------------------------------------ */

// Nothing scanned in yet — the show page shows the upload empty state.
export const ephemera: EphemeraItem[] = [];

/* ------------------------------------------------------------------ */
/* Memories                                                            */
/* ------------------------------------------------------------------ */

// None written yet — memory cards render their "Add memory" empty state.
export const memories: UserMemory[] = [];

/* ------------------------------------------------------------------ */
/* Media links                                                         */
/* ------------------------------------------------------------------ */

export const mediaLinks: MediaLink[] = [
  {
    id: "ml-rk-setlistfm",
    showId: "rilo-kiley-capitol-2025",
    kind: "setlistfm",
    label: "View on setlist.fm",
    sublabel: "Full setlist & tour stats",
    url: "https://www.setlist.fm/setlist/rilo-kiley/2025/capitol-theatre-port-chester-ny-2347a073.html",
  },
  {
    id: "ml-rk-youtube",
    showId: "rilo-kiley-capitol-2025",
    kind: "video",
    label: "Concert video from the night",
    sublabel: "YouTube",
    url: "https://www.youtube.com/watch?v=EAl7E9PPRxY",
  },
];

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export const collections: Collection[] = [
  {
    id: "col-2025-shows",
    name: "2025 Shows",
    description: "The year Rilo Kiley came back.",
    itemCount: 1,
    gradient: "ember",
  },
  {
    id: "col-poster-wall",
    name: "Poster Wall",
    description: "Prints from shows worth framing.",
    itemCount: 1,
    gradient: "dusk",
  },
];

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

/** Photos from the night — real shots, layered over a gradient fallback. */
export interface ShowPhoto {
  id: string;
  showId: string;
  caption: string;
  gradient: GradientKey;
  imageUrl?: string;
}

export const showPhotos: ShowPhoto[] = [
  {
    id: "ph-rk-1",
    showId: "rilo-kiley-capitol-2025",
    caption: "The Capitol stage",
    gradient: "ember",
    imageUrl:
      "https://res.cloudinary.com/dto3ky70u/image/upload/v1783452222/IMG_0277_sieqeu.jpg",
  },
  {
    id: "ph-rk-2",
    showId: "rilo-kiley-capitol-2025",
    caption: "Mid-set",
    gradient: "dusk",
    imageUrl:
      "https://res.cloudinary.com/dto3ky70u/image/upload/v1783452222/IMG_0273_j959nu.jpg",
  },
  {
    id: "ph-rk-3",
    showId: "rilo-kiley-capitol-2025",
    caption: "From the floor",
    gradient: "midnight",
    imageUrl:
      "https://res.cloudinary.com/dto3ky70u/image/upload/v1783452222/IMG_0269_mxh6xg.jpg",
  },
  {
    id: "ph-rk-4",
    showId: "rilo-kiley-capitol-2025",
    caption: "House lights up",
    gradient: "gold",
    imageUrl:
      "https://res.cloudinary.com/dto3ky70u/image/upload/v1783452287/IMG_0270_rcu3th.jpg",
  },
];

/* ------------------------------------------------------------------ */
/* Helpers — the read API the UI is built against                      */
/* ------------------------------------------------------------------ */

export function getArtist(id: string): Artist | undefined {
  return artists.find((a) => a.id === id);
}

export function getVenue(id: string): Venue | undefined {
  return venues.find((v) => v.id === id);
}

export function getTour(id: string): Tour | undefined {
  return tours.find((t) => t.id === id);
}

export function getShow(id: string): Show | undefined {
  return shows.find((s) => s.id === id);
}

/** All shows, newest first. */
export function getAllShows(): Show[] {
  return [...shows].sort((a, b) => b.date.localeCompare(a.date));
}

export function getAttendedShows(): Show[] {
  return getAllShows().filter((s) => s.attended);
}

export function getSetlistForShow(showId: string): Setlist | undefined {
  return setlists.find((s) => s.showId === showId);
}

export function getPostersForShow(showId: string): Poster[] {
  return posters.filter((p) => p.showId === showId);
}

export function getEphemeraForShow(showId: string): EphemeraItem[] {
  return ephemera.filter((e) => e.showId === showId);
}

export function getMemoryForShow(showId: string): UserMemory | undefined {
  return memories.find((m) => m.showId === showId);
}

export function getMediaLinksForShow(showId: string): MediaLink[] {
  return mediaLinks.filter((m) => m.showId === showId);
}

export function getPhotosForShow(showId: string): ShowPhoto[] {
  return showPhotos.filter((p) => p.showId === showId);
}

/** Sibling shows on the same tour (includes the given show), by date. */
export function getShowsForTour(tourId: string): Show[] {
  return shows
    .filter((s) => s.tourId === tourId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getShowsByArtist(artistId: string): Show[] {
  return getAllShows().filter((s) => s.artistId === artistId);
}

export function getShowsByVenue(venueId: string): Show[] {
  return getAllShows().filter((s) => s.venueId === venueId);
}

export function countSongsInSetlist(setlist: Setlist): number {
  return setlist.sets.reduce((n, set) => n + set.songs.length, 0);
}

/** Counts used for the sidebar "Collections" badges. */
export function getArchiveCounts() {
  return {
    shows: shows.filter((s) => s.attended).length,
    wishlist: posters.filter((p) => !p.owned).length,
    posters:
      posters.filter((p) => p.owned).length +
      ephemera.filter((e) => e.kind === "poster").length,
    tickets: ephemera.filter((e) => e.kind === "ticket").length,
    merch: ephemera.filter((e) => e.kind === "apparel" || e.kind === "other")
      .length,
    favorites: shows.filter((s) => s.favorite).length,
  };
}
