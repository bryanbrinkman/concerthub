/**
 * Drizzle schema for Concert Collect.
 *
 * Two groups of tables:
 *  1. Auth.js tables (user/account/session/verificationToken) — shapes
 *     required by @auth/drizzle-adapter.
 *  2. App tables — `artists`/`venues`/`tours`/`shows` are canonical rows
 *     shared across users (deduped on import via unique constraints);
 *     everything else is user-owned and keyed by userId.
 *
 * Apply with `npm run db:push` (drizzle-kit push) against DATABASE_URL.
 */

import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { Edition } from "@/lib/types";

const uuid = () => crypto.randomUUID();

/* ------------------------------------------------------------------ */
/* Auth.js tables                                                      */
/* ------------------------------------------------------------------ */

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(uuid),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  /** Username/password login (alternative to Google). Stored lowercase. */
  username: text("username").unique(),
  /** scrypt hash — see lib/password.ts. Null for OAuth-only accounts. */
  passwordHash: text("password_hash"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

/* ------------------------------------------------------------------ */
/* Canonical music data (shared across users)                          */
/* ------------------------------------------------------------------ */

export const artists = pgTable(
  "artist",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    name: text("name").notNull(),
    genres: text("genres").array(),
    hometown: text("hometown"),
    gradient: text("gradient").notNull().default("midnight"),
    setlistFmMbid: text("setlist_fm_mbid"),
  },
  (t) => [uniqueIndex("artist_name_idx").on(t.name)],
);

export const venues = pgTable(
  "venue",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    name: text("name").notNull(),
    city: text("city").notNull().default(""),
    region: text("region"),
    country: text("country"),
    capacity: integer("capacity"),
    gradient: text("gradient").notNull().default("midnight"),
  },
  (t) => [uniqueIndex("venue_name_city_idx").on(t.name, t.city)],
);

export const tours = pgTable(
  "tour",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    years: text("years").notNull().default(""),
  },
  (t) => [uniqueIndex("tour_artist_name_idx").on(t.artistId, t.name)],
);

export const shows = pgTable(
  "show",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    /**
     * Primary act — denormalized pointer to the headliner (or first-billed
     * performer). The full bill lives in show_performer; this column keeps
     * legacy queries and NOT NULL constraints working.
     */
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    tourId: text("tour_id").references(() => tours.id, {
      onDelete: "set null",
    }),
    /** Event name for festivals / multi-act bills ("Governors Ball 2014"). */
    name: text("name"),
    date: date("date", { mode: "string" }).notNull(),
    /** Last day of a multi-day event (festivals). */
    endDate: date("end_date", { mode: "string" }),
    /** concert | festival | festival_day | multi_act | other */
    eventType: text("event_type").notNull().default("concert"),
    /** Stage, for festival-day/stage records. */
    stage: text("stage"),
    /** Parent festival show for festival-day records (FK added in SQL). */
    festivalId: text("festival_id"),
    showTime: text("show_time"),
    gradient: text("gradient").notNull().default("midnight"),
    /** setlist.fm setlist id — dedupe key for imports. */
    setlistFmId: text("setlist_fm_id"),
    setlistFmUrl: text("setlist_fm_url"),
  },
  (t) => [uniqueIndex("show_setlist_fm_idx").on(t.setlistFmId)],
);

/**
 * The full bill for a show/event — many-to-many between shows and
 * performers. Canonical (shared across users); every performer is a full
 * artist row, so support acts and festival lineups get artist pages.
 * Replaces the old show_opener table (migrated by drizzle/0006).
 */
export const showPerformers = pgTable(
  "show_performer",
  {
    showId: text("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    /** headliner | co_headliner | support | opener | festival_performer |
     *  special_guest | unknown */
    billingRole: text("billing_role").notNull().default("headliner"),
    /** 1 = top of the bill. */
    billingOrder: integer("billing_order").notNull().default(1),
    stage: text("stage"),
    setTime: text("set_time"),
    /** This performer's own setlist.fm set at this event. */
    setlistFmId: text("setlist_fm_id"),
    setlistFmUrl: text("setlist_fm_url"),
    /** user | setlist.fm | migration | demo */
    source: text("source").notNull().default("user"),
    /** confirmed | inferred */
    confidence: text("confidence").notNull().default("confirmed"),
  },
  (t) => [primaryKey({ columns: [t.showId, t.artistId] })],
);

/* ------------------------------------------------------------------ */
/* User-owned archive rows                                             */
/* ------------------------------------------------------------------ */

/** Attendance + per-user flags for a canonical show. */
export const userShows = pgTable(
  "user_show",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    showId: text("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    attended: boolean("attended").notNull().default(true),
    favorite: boolean("favorite").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.showId] })],
);

export const memories = pgTable("memory", {
  id: text("id").primaryKey().$defaultFn(uuid),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  showId: text("show_id")
    .notNull()
    .references(() => shows.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  attendedWith: text("attended_with").array(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const ephemeraItems = pgTable("ephemera_item", {
  id: text("id").primaryKey().$defaultFn(uuid),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  showId: text("show_id")
    .notNull()
    .references(() => shows.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("other"),
  title: text("title").notNull(),
  detail: text("detail"),
  gradient: text("gradient").notNull().default("midnight"),
  imageUrl: text("image_url"),
});

export const posters = pgTable("poster", {
  id: text("id").primaryKey().$defaultFn(uuid),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  showId: text("show_id").references(() => shows.id, { onDelete: "set null" }),
  tourId: text("tour_id").references(() => tours.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  designer: text("designer").notNull().default("Unknown"),
  year: integer("year").notNull(),
  notes: text("notes"),
  gradient: text("gradient").notNull().default("midnight"),
  owned: boolean("owned").notNull().default(true),
  /** Collection state: own | want | trade | sell. */
  state: text("state").notNull().default("own"),
  /**
   * What the print documents: "show" (a specific date/venue, tied to a
   * showId) or "tour" (multiple dates, tied to a tourId).
   */
  posterType: text("poster_type").notNull().default("show"),
  /**
   * Parent poster design when this print is a variant (foil, color way,
   * AP, glow…). Groups variants under one design instead of fragmenting
   * the catalog. Self-FK added in SQL (drizzle/0013).
   */
  variantOf: text("variant_of"),
  imageUrl: text("image_url"),
  /** Additional detail shots (numbering, signature, foil, condition). */
  imageUrls: text("image_urls").array(),
  expressoBeansId: integer("expresso_beans_id"),
  editions: jsonb("editions").$type<Edition[]>(),
});

/**
 * Poster artists (print designers) as a light shared entity, keyed by the
 * same slug used in their public URLs (posterArtistSlug). Populated from the
 * add-poster form so a designer's website is recorded once and shown across
 * their posterography. Not user-owned — one canonical row per designer.
 */
export const posterArtists = pgTable("poster_artist", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const mediaLinks = pgTable("media_link", {
  id: text("id").primaryKey().$defaultFn(uuid),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  showId: text("show_id")
    .notNull()
    .references(() => shows.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("video"),
  label: text("label").notNull(),
  sublabel: text("sublabel"),
  duration: text("duration"),
  url: text("url").notNull(),
});

export const showPhotos = pgTable("show_photo", {
  id: text("id").primaryKey().$defaultFn(uuid),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  showId: text("show_id")
    .notNull()
    .references(() => shows.id, { onDelete: "cascade" }),
  caption: text("caption").notNull().default(""),
  gradient: text("gradient").notNull().default("midnight"),
  imageUrl: text("image_url"),
});

/**
 * A collector raising their hand on someone else's print. Concert Collect
 * doesn't broker sales — the owner sees the interested user's name/email
 * and they work it out off-site.
 */
export const posterInterests = pgTable(
  "poster_interest",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    posterId: text("poster_id")
      .notNull()
      .references(() => posters.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("poster_interest_unique_idx").on(t.posterId, t.userId),
  ],
);

/* ------------------------------------------------------------------ */
/* Show enrichment engine (lib/enrich)                                 */
/* ------------------------------------------------------------------ */

/** One provider run for one show — progress + rate-limit bookkeeping. */
export const enrichmentJobs = pgTable("enrichment_job", {
  id: text("id").primaryKey().$defaultFn(uuid),
  showId: text("show_id")
    .notNull()
    .references(() => shows.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  /** running | done | error | skipped */
  status: text("status").notNull().default("running"),
  detail: text("detail"),
  candidateCount: integer("candidate_count").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * A suggested fact about a show with full provenance — never merged into
 * canonical records without confidence gating (auto-accept) or human
 * review. kind: performer | event_meta | poster_image | video |
 * marketplace | reference.
 */
export const dataCandidates = pgTable(
  "data_candidate",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    showId: text("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /** Images: official_poster | possible_poster | event_image | ticket |
     *  merch | unknown. Web discoveries default to possible_poster. */
    candidateType: text("candidate_type"),
    /** Stable dedupe key within (show, kind): video id, image URL, name… */
    valueKey: text("value_key").notNull(),
    value: jsonb("value").notNull().$type<Record<string, unknown>>(),
    provider: text("provider").notNull(),
    sourceUrl: text("source_url"),
    /** 0–100. */
    confidence: integer("confidence").notNull().default(20),
    /** Human-readable scoring reasons ("Exact event name", …). */
    reasons: text("reasons").array(),
    /** pending | auto_accepted | user_confirmed | rejected | superseded */
    status: text("status").notNull().default("pending"),
    fetchedAt: timestamp("fetched_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("candidate_unique_idx").on(t.showId, t.kind, t.valueKey)],
);

/** Raw provider responses, cached per normalized query. */
export const providerCache = pgTable(
  "provider_cache",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    provider: text("provider").notNull(),
    queryKey: text("query_key").notNull(),
    response: jsonb("response").$type<unknown>(),
    fetchedAt: timestamp("fetched_at", { mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  },
  (t) => [uniqueIndex("provider_cache_key_idx").on(t.provider, t.queryKey)],
);

/**
 * A user's gallery wall: hand-arranged poster layout. Coordinates are
 * percentages (x/w of wall width, y of wall height) so the wall scales
 * to any screen.
 */
export const galleryWalls = pgTable("gallery_wall", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  layout: jsonb("layout")
    .notNull()
    .$type<Array<{ posterId: string; x: number; y: number; w: number; z: number }>>(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const collections = pgTable("collection", {
  id: text("id").primaryKey().$defaultFn(uuid),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  itemCount: integer("item_count").notNull().default(0),
  gradient: text("gradient").notNull().default("midnight"),
});

/** Posters grouped into a user's custom collection (binder/wishlist). */
export const collectionPosters = pgTable(
  "collection_poster",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    posterId: text("poster_id")
      .notNull()
      .references(() => posters.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.posterId] })],
);
