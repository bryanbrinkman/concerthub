/**
 * Concert Collect — local seed data.
 *
 * Everything here is mock data so the app works with no backend and no auth.
 *
 * TODO(api): This module is the seam for future integrations.
 *  - setlist.fm: replace `setlists` with a fetch against the setlist.fm REST
 *    API (https://api.setlist.fm/rest/1.0/) keyed by artist MBID + show date.
 *  - Expresso Beans: replace poster/edition metadata + market values with
 *    lookups against Expresso Beans (expressobeans.com) item pages.
 *  - Keep the helper functions below as the public interface so pages and
 *    components don't need to change when real data sources arrive.
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
    id: "tame-impala",
    name: "Tame Impala",
    genres: ["Psych Rock", "Synth Pop"],
    hometown: "Perth, Australia",
    gradient: "aurora",
  },
  {
    id: "lcd-soundsystem",
    name: "LCD Soundsystem",
    genres: ["Dance-Punk", "Electronic"],
    hometown: "Brooklyn, NY",
    gradient: "midnight",
  },
  {
    id: "khruangbin",
    name: "Khruangbin",
    genres: ["Psych Funk", "Global Groove"],
    hometown: "Houston, TX",
    gradient: "jade",
  },
  {
    id: "war-on-drugs",
    name: "The War on Drugs",
    genres: ["Heartland Rock", "Indie"],
    hometown: "Philadelphia, PA",
    gradient: "ember",
  },
  {
    id: "king-gizzard",
    name: "King Gizzard & The Lizard Wizard",
    genres: ["Psych Rock", "Everything"],
    hometown: "Melbourne, Australia",
    gradient: "gold",
  },
  {
    id: "fleet-foxes",
    name: "Fleet Foxes",
    genres: ["Indie Folk"],
    hometown: "Seattle, WA",
    gradient: "ocean",
  },
];

/* ------------------------------------------------------------------ */
/* Venues                                                              */
/* ------------------------------------------------------------------ */

export const venues: Venue[] = [
  {
    id: "msg",
    name: "Madison Square Garden",
    city: "New York",
    region: "NY",
    country: "USA",
    capacity: 20789,
    gradient: "neon",
  },
  {
    id: "td-garden",
    name: "TD Garden",
    city: "Boston",
    region: "MA",
    country: "USA",
    capacity: 19580,
    gradient: "ocean",
  },
  {
    id: "wells-fargo-center",
    name: "Wells Fargo Center",
    city: "Philadelphia",
    region: "PA",
    country: "USA",
    capacity: 21000,
    gradient: "dusk",
  },
  {
    id: "scotiabank-arena",
    name: "Scotiabank Arena",
    city: "Toronto",
    region: "ON",
    country: "Canada",
    capacity: 19800,
    gradient: "ember",
  },
  {
    id: "united-center",
    name: "United Center",
    city: "Chicago",
    region: "IL",
    country: "USA",
    capacity: 23500,
    gradient: "gold",
  },
  {
    id: "brooklyn-steel",
    name: "Brooklyn Steel",
    city: "Brooklyn",
    region: "NY",
    country: "USA",
    capacity: 1800,
    gradient: "midnight",
  },
  {
    id: "red-rocks",
    name: "Red Rocks Amphitheatre",
    city: "Morrison",
    region: "CO",
    country: "USA",
    capacity: 9525,
    gradient: "ember",
  },
  {
    id: "forest-hills",
    name: "Forest Hills Stadium",
    city: "Queens",
    region: "NY",
    country: "USA",
    capacity: 13000,
    gradient: "jade",
  },
];

/* ------------------------------------------------------------------ */
/* Tours                                                               */
/* ------------------------------------------------------------------ */

export const tours: Tour[] = [
  {
    id: "slow-rush-tour",
    artistId: "tame-impala",
    name: "The Slow Rush Tour",
    years: "2022",
  },
  {
    id: "idtio-tour",
    artistId: "war-on-drugs",
    name: "I Don't Live Here Anymore Tour",
    years: "2022",
  },
];

/* ------------------------------------------------------------------ */
/* Shows                                                               */
/* ------------------------------------------------------------------ */

export const shows: Show[] = [
  // ---- The Slow Rush Tour, Sep 2022 run ----
  {
    id: "tame-impala-msg-2022",
    artistId: "tame-impala",
    venueId: "msg",
    tourId: "slow-rush-tour",
    date: "2022-09-14",
    showTime: "7:30 PM",
    attended: true,
    favorite: true,
    attendeeCount: 47,
    gradient: "aurora",
  },
  {
    id: "tame-impala-boston-2022",
    artistId: "tame-impala",
    venueId: "td-garden",
    tourId: "slow-rush-tour",
    date: "2022-09-11",
    showTime: "7:30 PM",
    attended: false,
    favorite: false,
    gradient: "ocean",
  },
  {
    id: "tame-impala-philly-2022",
    artistId: "tame-impala",
    venueId: "wells-fargo-center",
    tourId: "slow-rush-tour",
    date: "2022-09-12",
    showTime: "7:30 PM",
    attended: false,
    favorite: false,
    gradient: "dusk",
  },
  {
    id: "tame-impala-toronto-2022",
    artistId: "tame-impala",
    venueId: "scotiabank-arena",
    tourId: "slow-rush-tour",
    date: "2022-09-16",
    showTime: "7:30 PM",
    attended: false,
    favorite: false,
    gradient: "ember",
  },
  {
    id: "tame-impala-chicago-2022",
    artistId: "tame-impala",
    venueId: "united-center",
    tourId: "slow-rush-tour",
    date: "2022-09-18",
    showTime: "7:30 PM",
    attended: false,
    favorite: false,
    gradient: "gold",
  },

  // ---- Other archive entries ----
  {
    // Intentionally sparse: no poster, no ephemera, no memory, no media —
    // exercises every empty state on the show detail page.
    id: "lcd-brooklyn-2021",
    artistId: "lcd-soundsystem",
    venueId: "brooklyn-steel",
    date: "2021-12-08",
    showTime: "8:00 PM",
    attended: true,
    favorite: false,
    attendeeCount: 3,
    gradient: "midnight",
  },
  {
    id: "khruangbin-red-rocks-2023",
    artistId: "khruangbin",
    venueId: "red-rocks",
    date: "2023-08-22",
    showTime: "7:00 PM",
    attended: true,
    favorite: true,
    attendeeCount: 12,
    gradient: "jade",
  },
  {
    id: "wod-msg-2022",
    artistId: "war-on-drugs",
    venueId: "msg",
    tourId: "idtio-tour",
    date: "2022-01-29",
    showTime: "8:00 PM",
    attended: true,
    favorite: false,
    attendeeCount: 8,
    gradient: "ember",
  },
  {
    id: "king-gizzard-forest-hills-2023",
    artistId: "king-gizzard",
    venueId: "forest-hills",
    date: "2023-06-16",
    showTime: "6:30 PM",
    attended: true,
    favorite: false,
    attendeeCount: 5,
    gradient: "gold",
  },
  {
    id: "fleet-foxes-forest-hills-2021",
    artistId: "fleet-foxes",
    venueId: "forest-hills",
    date: "2021-09-25",
    showTime: "7:00 PM",
    attended: true,
    favorite: false,
    gradient: "ocean",
  },
];

/* ------------------------------------------------------------------ */
/* Setlists                                                            */
/* ------------------------------------------------------------------ */

// These are the OFFLINE FALLBACKS. When SETLISTFM_API_KEY is set, show pages
// resolve live setlists via lib/setlistfm.ts (artist name + date search) and
// only fall back to these seeds when the API has no match.
export const setlists: Setlist[] = [
  {
    id: "setlist-tame-msg-2022",
    showId: "tame-impala-msg-2022",
    source: "setlist.fm",
    sourceUrl: "https://www.setlist.fm/",
    sets: [
      {
        name: "Main Set",
        songs: [
          { title: "One More Year" },
          { title: "Instant Destiny" },
          { title: "Borderline" },
          { title: "Posthumous Forgiveness" },
          { title: "Breathe Deeper" },
          { title: "Tomorrow's Dust" },
          { title: "On Track" },
          { title: "Lost in Yesterday" },
          { title: "Is It True" },
          { title: "It Might Be Time" },
          { title: "Eventually", note: "extended outro, confetti" },
          { title: "The Less I Know the Better" },
          { title: "Nangs" },
          { title: "New Person, Same Old Mistakes" },
        ],
      },
      {
        name: "Encore",
        songs: [{ title: "Let It Happen", note: "laser tunnel finale" }],
      },
    ],
  },
  {
    id: "setlist-khruangbin-rr-2023",
    showId: "khruangbin-red-rocks-2023",
    source: "user",
    sets: [
      {
        name: "Main Set",
        songs: [
          { title: "First Class" },
          { title: "August 10" },
          { title: "Ali", note: "with Vieux Farka Touré" },
          { title: "Maria También" },
          { title: "Pelota" },
          { title: "Evan Finds the Third Room" },
          { title: "Time (You and I)" },
        ],
      },
      {
        name: "Encore",
        songs: [{ title: "People Everywhere (Still Alive)" }],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Posters                                                             */
/* ------------------------------------------------------------------ */

// To pull real poster imagery from Expresso Beans, set `expressoBeansId` to
// the number from the item page URL (expressobeans.com/public/detail.php/<id>)
// — lib/expressobeans.ts fetches the image and deep link, and the UI falls
// back to gradient art when the id is unset or the fetch fails.
// TODO(api): also pull market data (avg sale, last sale, have/want counts).
export const posters: Poster[] = [
  {
    id: "poster-tame-msg-2022",
    showId: "tame-impala-msg-2022",
    tourId: "slow-rush-tour",
    title: "Madison Square Garden",
    designer: "Status Serigraph",
    year: 2022,
    notes: "Official show poster",
    gradient: "aurora",
    owned: true,
    // expressoBeansId: 123456, // <- paste the real EB item id to activate
    editions: [
      {
        id: "ed-tame-msg-reg",
        name: "Regular",
        runSize: 300,
        copyNumber: 137,
        technique: "6-color screen print",
        dimensions: '18" x 24"',
        markings: "Numbered in pencil, bottom right",
      },
      {
        id: "ed-tame-msg-foil",
        name: "Rainbow Foil Variant",
        runSize: 60,
        technique: "6-color screen print on foil",
        dimensions: '18" x 24"',
        markings: "Signed & numbered",
      },
    ],
  },
  {
    id: "poster-khruangbin-rr-2023",
    showId: "khruangbin-red-rocks-2023",
    title: "Red Rocks Night Two",
    designer: "Landland",
    year: 2023,
    notes: "Night-specific variant with moon phase",
    gradient: "jade",
    owned: true,
    editions: [
      {
        id: "ed-khruangbin-rr-reg",
        name: "Regular",
        runSize: 450,
        copyNumber: 88,
        technique: "4-color screen print",
        dimensions: '18" x 24"',
        markings: "Numbered in pencil",
      },
    ],
  },
  {
    id: "poster-wod-msg-2022",
    showId: "wod-msg-2022",
    tourId: "idtio-tour",
    title: "MSG — I Don't Live Here Anymore",
    designer: "Dan Grzeca",
    year: 2022,
    notes: "Wishlist — still hunting a copy",
    gradient: "ember",
    owned: false,
    editions: [
      {
        id: "ed-wod-msg-reg",
        name: "Regular",
        runSize: 250,
        technique: "5-color screen print",
        dimensions: '18" x 24"',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Ephemera                                                            */
/* ------------------------------------------------------------------ */

export const ephemera: EphemeraItem[] = [
  // Tame Impala @ MSG — the fully-stocked archive entry
  {
    id: "eph-tame-ticket",
    showId: "tame-impala-msg-2022",
    kind: "ticket",
    title: "Ticket Stub",
    detail: "Sec 110 · Row 18 · Seat 7 · $89.50",
    gradient: "dusk",
  },
  {
    id: "eph-tame-laminate",
    showId: "tame-impala-msg-2022",
    kind: "laminate",
    title: "VIP Laminate",
    detail: "The Slow Rush Tour · MSG",
    gradient: "neon",
  },
  {
    id: "eph-tame-wristband",
    showId: "tame-impala-msg-2022",
    kind: "wristband",
    title: "Wristband",
    detail: "9.14.22 · MSG · Floor",
    gradient: "ember",
  },
  {
    id: "eph-tame-poster",
    showId: "tame-impala-msg-2022",
    kind: "poster",
    title: "Tour Poster",
    detail: "Limited edition of 300",
    gradient: "aurora",
  },
  {
    id: "eph-tame-hat",
    showId: "tame-impala-msg-2022",
    kind: "apparel",
    title: "Hat",
    detail: "Embroidered logo snapback",
    gradient: "midnight",
  },
  {
    id: "eph-tame-tee",
    showId: "tame-impala-msg-2022",
    kind: "apparel",
    title: "Tour Tee",
    detail: "Slow Rush dateback · L",
    gradient: "gold",
  },

  // Khruangbin @ Red Rocks
  {
    id: "eph-khruangbin-ticket",
    showId: "khruangbin-red-rocks-2023",
    kind: "ticket",
    title: "Ticket Stub",
    detail: "GA · Row 28",
    gradient: "jade",
  },
  {
    id: "eph-khruangbin-poster",
    showId: "khruangbin-red-rocks-2023",
    kind: "poster",
    title: "Show Poster",
    detail: "Landland · #88/450",
    gradient: "ocean",
  },

  // The War on Drugs @ MSG
  {
    id: "eph-wod-ticket",
    showId: "wod-msg-2022",
    kind: "ticket",
    title: "Ticket Stub",
    detail: "Sec 213 · Row 4 · Seat 12",
    gradient: "ember",
  },
  {
    id: "eph-gizz-tee",
    showId: "king-gizzard-forest-hills-2023",
    kind: "apparel",
    title: "Gator Tee",
    detail: "Tour dateback · M",
    gradient: "gold",
  },
];

/* ------------------------------------------------------------------ */
/* Memories                                                            */
/* ------------------------------------------------------------------ */

export const memories: UserMemory[] = [
  {
    id: "mem-tame-msg",
    showId: "tame-impala-msg-2022",
    text: "Incredible night. The entire arena was floating. “Eventually” hit so hard live. One of the best shows I've ever been to.",
    createdAt: "2022-09-15",
    attendedWith: ["Alex", "Sam"],
  },
  {
    id: "mem-khruangbin-rr",
    showId: "khruangbin-red-rocks-2023",
    text: "Golden hour set under the rocks. The whole crowd swayed through “Time (You and I)” — felt like one long exhale.",
    createdAt: "2023-08-23",
    attendedWith: ["Jordan"],
  },
  {
    id: "mem-wod-msg",
    showId: "wod-msg-2022",
    text: "“Under the Pressure” opener nearly took the roof off. Adam's solos echoed around the Garden forever.",
    createdAt: "2022-01-30",
  },
];

/* ------------------------------------------------------------------ */
/* Media links                                                         */
/* ------------------------------------------------------------------ */

// TODO(api): the setlist.fm and Expresso Beans URLs below are placeholders —
// deep-link to the exact setlist / poster item pages once the integrations
// can resolve real ids.
export const mediaLinks: MediaLink[] = [
  {
    id: "ml-tame-setlistfm",
    showId: "tame-impala-msg-2022",
    kind: "setlistfm",
    label: "View on setlist.fm",
    sublabel: "Full setlist & tour stats",
    url: "https://www.setlist.fm/",
  },
  {
    id: "ml-tame-eb",
    showId: "tame-impala-msg-2022",
    kind: "expressobeans",
    label: "View on Expresso Beans",
    sublabel: "Poster market history",
    url: "https://www.expressobeans.com/",
  },
  {
    id: "ml-tame-aud",
    showId: "tame-impala-msg-2022",
    kind: "audio",
    label: "Full Show Recording (AUD)",
    sublabel: "by tapername",
    duration: "1:45:21",
    url: "https://archive.org/",
  },
  {
    id: "ml-tame-yt",
    showId: "tame-impala-msg-2022",
    kind: "video",
    label: "The Less I Know the Better (Live)",
    sublabel: "YouTube",
    duration: "4:48",
    url: "https://www.youtube.com/",
  },
  {
    id: "ml-tame-photos",
    showId: "tame-impala-msg-2022",
    kind: "photos",
    label: "Photos from the show",
    sublabel: "Google Photos album",
    url: "https://photos.google.com/",
  },
  {
    id: "ml-khruangbin-setlistfm",
    showId: "khruangbin-red-rocks-2023",
    kind: "setlistfm",
    label: "View on setlist.fm",
    sublabel: "Full setlist",
    url: "https://www.setlist.fm/",
  },
];

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export const collections: Collection[] = [
  {
    id: "col-2022-arena-run",
    name: "2022 Arena Run",
    description: "Every big-room show from the year live music came back.",
    itemCount: 4,
    gradient: "aurora",
  },
  {
    id: "col-screen-print-binder",
    name: "Screen Print Binder",
    description: "Flat-file favorites — numbered runs and variants.",
    itemCount: 3,
    gradient: "neon",
  },
  {
    id: "col-ticket-stub-shoebox",
    name: "Ticket Stub Shoebox",
    description: "Every stub that survived the wash.",
    itemCount: 3,
    gradient: "dusk",
  },
  {
    id: "col-wishlist",
    name: "Wishlist",
    description: "Grails and gaps — posters and stubs still being hunted.",
    itemCount: 1,
    gradient: "ember",
  },
];

/* ------------------------------------------------------------------ */
/* Photo placeholders                                                  */
/* ------------------------------------------------------------------ */

/** Mock "photos from the night" — rendered as gradient cards until uploads exist. */
export interface ShowPhoto {
  id: string;
  showId: string;
  caption: string;
  gradient: GradientKey;
}

export const showPhotos: ShowPhoto[] = [
  { id: "ph-1", showId: "tame-impala-msg-2022", caption: "Lasers over the floor", gradient: "neon" },
  { id: "ph-2", showId: "tame-impala-msg-2022", caption: "Marquee — sold out", gradient: "midnight" },
  { id: "ph-3", showId: "tame-impala-msg-2022", caption: "The big red sun", gradient: "ember" },
  { id: "ph-4", showId: "tame-impala-msg-2022", caption: "Confetti during Eventually", gradient: "gold" },
  { id: "ph-5", showId: "tame-impala-msg-2022", caption: "Balloons at the encore", gradient: "aurora" },
  { id: "ph-6", showId: "tame-impala-msg-2022", caption: "View from Sec 110", gradient: "dusk" },
  { id: "ph-7", showId: "khruangbin-red-rocks-2023", caption: "Golden hour at the rocks", gradient: "gold" },
  { id: "ph-8", showId: "khruangbin-red-rocks-2023", caption: "Moon over the stage", gradient: "midnight" },
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
    posters: posters.filter((p) => p.owned).length + ephemera.filter((e) => e.kind === "poster").length,
    tickets: ephemera.filter((e) => e.kind === "ticket").length,
    merch: ephemera.filter((e) => e.kind === "apparel" || e.kind === "other").length,
    favorites: shows.filter((s) => s.favorite).length,
  };
}
