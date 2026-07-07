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
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    tourId: text("tour_id").references(() => tours.id, {
      onDelete: "set null",
    }),
    date: date("date", { mode: "string" }).notNull(),
    showTime: text("show_time"),
    gradient: text("gradient").notNull().default("midnight"),
    /** setlist.fm setlist id — dedupe key for imports. */
    setlistFmId: text("setlist_fm_id"),
    setlistFmUrl: text("setlist_fm_url"),
  },
  (t) => [uniqueIndex("show_setlist_fm_idx").on(t.setlistFmId)],
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
  imageUrl: text("image_url"),
  expressoBeansId: integer("expresso_beans_id"),
  editions: jsonb("editions").$type<Edition[]>(),
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
