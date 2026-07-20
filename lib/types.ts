/**
 * Concert Collect — core data model.
 *
 * These types are designed to be future-ready: today they are populated from
 * local seed data in `lib/data.ts`, but the shapes mirror what we expect to
 * receive from external sources (setlist.fm for setlists, Expresso Beans for
 * poster/print market data) so swapping in real APIs later is low-friction.
 */

/** Named gradient used for generated placeholder artwork (see components/gradient-art.tsx). */
export type GradientKey =
  | "aurora"
  | "dusk"
  | "ember"
  | "ocean"
  | "jade"
  | "gold"
  | "midnight"
  | "neon";

export interface Artist {
  id: string;
  name: string;
  genres: string[];
  hometown?: string;
  /** Placeholder art until real artist imagery exists. */
  gradient: GradientKey;
  /**
   * MusicBrainz id, for precise setlist.fm lookups. Optional — when unset,
   * lib/setlistfm.ts searches by artist name instead.
   */
  setlistFmMbid?: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  region?: string; // state / province
  country: string;
  capacity?: number;
  gradient: GradientKey;
  // TODO(api): add `setlistFmVenueId` for setlist.fm venue matching.
}

export interface Tour {
  id: string;
  artistId: string;
  name: string;
  years: string; // e.g. "2022–2023"
}

export interface Song {
  title: string;
  /** Cover of another artist's song. */
  coverOf?: string;
  /** Anything notable — guest, debut, tease, etc. */
  note?: string;
}

export interface SetlistSet {
  /** e.g. "Set 1", "Encore" */
  name: string;
  songs: Song[];
}

export interface Setlist {
  id: string;
  showId: string;
  sets: SetlistSet[];
  source: "user" | "setlist.fm";
  sourceUrl?: string;
  // TODO(api): hydrate from the setlist.fm REST API
  // (GET /rest/1.0/setlist/{setlistId}) and store the raw payload alongside.
}

/** Where a print sits in the collection lifecycle. */
export type PosterState = "own" | "want" | "trade" | "sell";

/** A single print run / variant of a poster (regular, foil, AP, etc.). */
export interface Edition {
  id: string;
  name: string; // e.g. "Regular", "Foil Variant", "Artist Proof"
  runSize?: number;
  /** The collector's copy number within the run, if owned. */
  copyNumber?: number;
  technique?: string; // e.g. "6-color screen print"
  /** Physical size in inches — structured so sizes are computable. */
  widthIn?: number;
  heightIn?: number;
  /**
   * @deprecated Legacy free-text size ("18\" x 24\"") — migrated to
   * widthIn/heightIn by drizzle/0009; kept only as a display fallback
   * for unparseable strings.
   */
  dimensions?: string;
  /** Autographed by the poster artist and/or band. */
  signed?: boolean;
  markings?: string; // e.g. "Signed & numbered in pencil"
}

/** Whether a print documents one show, a whole tour, or a festival. */
export type PosterType = "show" | "tour" | "festival";

export interface Poster {
  id: string;
  showId?: string;
  tourId?: string;
  /** "show" (specific date/venue) or "tour" (multiple dates). */
  posterType?: PosterType;
  /** Parent poster design when this print is a variant (foil, AP, …). */
  variantOf?: string;
  title: string;
  /** The print artist / designer, not the band. */
  designer: string;
  year: number;
  editions: Edition[];
  notes?: string;
  gradient: GradientKey;
  owned: boolean;
  /** Collection state — Own / Want / For Trade / For Sale. */
  state?: PosterState;
  /**
   * Numeric id from the Expresso Beans item page URL
   * (expressobeans.com/public/detail.php/<id>). When set,
   * lib/expressobeans.ts pulls the real poster image and deep link.
   */
  expressoBeansId?: number;
  /** Hand-curated artwork URL; takes precedence over EB-scraped imagery. */
  imageUrl?: string;
  /** Additional detail shots — numbering, signature, foil, condition. */
  imageUrls?: string[];
  // TODO(api): add market data (avg sale, last sale, have/want counts)
  // from Expresso Beans once that's worth scraping too.
}

export type EphemeraKind =
  | "ticket"
  | "laminate"
  | "wristband"
  | "poster"
  | "apparel"
  | "other";

export interface EphemeraItem {
  id: string;
  showId: string;
  kind: EphemeraKind;
  title: string;
  /** Dense collector metadata, e.g. "Sec 110 · Row 18 · Seat 7". */
  detail?: string;
  gradient: GradientKey;
  /** Photo/scan of the item; gradient + icon placeholder when unset. */
  imageUrl?: string;
}

export interface UserMemory {
  id: string;
  showId: string;
  text: string;
  /** ISO date the memory was written. */
  createdAt: string;
  attendedWith?: string[];
}

export type MediaLinkKind =
  | "setlistfm"
  | "expressobeans"
  | "audio"
  | "video"
  | "photos"
  | "streaming";

export interface MediaLink {
  id: string;
  showId: string;
  kind: MediaLinkKind;
  label: string;
  sublabel?: string; // e.g. "YouTube", "by tapername"
  duration?: string; // e.g. "1:45:21"
  url: string;
}

/** Where a performer sits on a show's bill. */
export type BillingRole =
  | "headliner"
  | "co_headliner"
  | "support"
  | "opener"
  | "festival_performer"
  | "special_guest"
  | "unknown";

/** What kind of event a show record represents. */
export type EventType =
  | "concert"
  | "festival"
  | "festival_day"
  | "multi_act"
  | "other";

/** One performer's slot on a show/event bill. */
export interface ShowPerformer {
  artistId: string;
  billingRole: BillingRole;
  /** 1 = top of the bill. */
  billingOrder: number;
  stage?: string;
  setTime?: string;
  /** This performer's own setlist.fm set at the event. */
  setlistFmId?: string;
  setlistFmUrl?: string;
}

export interface Show {
  id: string;
  /**
   * Primary act (headliner / first-billed) — denormalized from the full
   * bill in `performers` so single-artist paths keep working.
   */
  artistId: string;
  venueId: string;
  /** The full bill, in billing order. Absent = single-artist show. */
  performers?: ShowPerformer[];
  /** Event name — festivals and multi-act bills ("Governors Ball 2014"). */
  name?: string;
  eventType?: EventType;
  /** Parent festival show id for festival-day records. */
  festivalId?: string;
  stage?: string;
  tourId?: string;
  /** ISO date, local to the venue. */
  date: string;
  /** Last day of a multi-day event. */
  endDate?: string;
  showTime?: string; // e.g. "7:30 PM"
  attended: boolean;
  favorite: boolean;
  /** Others in the user's circle who were there (mock for now). */
  attendeeCount?: number;
  gradient: GradientKey;
  /** Explicitly linked setlist.fm setlist — beats the name+date search. */
  setlistFmId?: string;
  setlistFmUrl?: string;
}

/** A photo from a show night. */
export interface ShowPhoto {
  id: string;
  showId: string;
  caption: string;
  gradient: GradientKey;
  imageUrl?: string;
}

/** A user-curated grouping of shows/items — binders, wishlists, tour runs. */
export interface Collection {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  gradient: GradientKey;
}
