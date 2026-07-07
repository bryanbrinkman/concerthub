-- Concert Collect — initial schema.
-- Matches lib/db/schema.ts. Two ways to apply:
--   a) npm run db:push          (drizzle-kit, uses DATABASE_URL), or
--   b) paste this whole file into the Neon console SQL Editor and run it.
-- Idempotent: every statement is IF NOT EXISTS.

-- ---------------------------------------------------------------
-- Auth.js tables
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY,
  "name" text,
  "email" text UNIQUE,
  "emailVerified" timestamp,
  "image" text
);

CREATE TABLE IF NOT EXISTS "account" (
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "providerAccountId" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  PRIMARY KEY ("provider", "providerAccountId")
);

CREATE TABLE IF NOT EXISTS "session" (
  "sessionToken" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verificationToken" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

-- ---------------------------------------------------------------
-- Canonical music data (shared across users)
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "artist" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "genres" text[],
  "hometown" text,
  "gradient" text NOT NULL DEFAULT 'midnight',
  "setlist_fm_mbid" text
);
CREATE UNIQUE INDEX IF NOT EXISTS "artist_name_idx" ON "artist" ("name");

CREATE TABLE IF NOT EXISTS "venue" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "city" text NOT NULL DEFAULT '',
  "region" text,
  "country" text,
  "capacity" integer,
  "gradient" text NOT NULL DEFAULT 'midnight'
);
CREATE UNIQUE INDEX IF NOT EXISTS "venue_name_city_idx" ON "venue" ("name", "city");

CREATE TABLE IF NOT EXISTS "tour" (
  "id" text PRIMARY KEY,
  "artist_id" text NOT NULL REFERENCES "artist"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "years" text NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS "tour_artist_name_idx" ON "tour" ("artist_id", "name");

CREATE TABLE IF NOT EXISTS "show" (
  "id" text PRIMARY KEY,
  "artist_id" text NOT NULL REFERENCES "artist"("id") ON DELETE CASCADE,
  "venue_id" text NOT NULL REFERENCES "venue"("id") ON DELETE CASCADE,
  "tour_id" text REFERENCES "tour"("id") ON DELETE SET NULL,
  "date" date NOT NULL,
  "show_time" text,
  "gradient" text NOT NULL DEFAULT 'midnight',
  "setlist_fm_id" text,
  "setlist_fm_url" text
);
CREATE UNIQUE INDEX IF NOT EXISTS "show_setlist_fm_idx" ON "show" ("setlist_fm_id");

-- ---------------------------------------------------------------
-- User-owned archive rows
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "user_show" (
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "show_id" text NOT NULL REFERENCES "show"("id") ON DELETE CASCADE,
  "attended" boolean NOT NULL DEFAULT true,
  "favorite" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "show_id")
);

CREATE TABLE IF NOT EXISTS "memory" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "show_id" text NOT NULL REFERENCES "show"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "attended_with" text[],
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ephemera_item" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "show_id" text NOT NULL REFERENCES "show"("id") ON DELETE CASCADE,
  "kind" text NOT NULL DEFAULT 'other',
  "title" text NOT NULL,
  "detail" text,
  "gradient" text NOT NULL DEFAULT 'midnight',
  "image_url" text
);

CREATE TABLE IF NOT EXISTS "poster" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "show_id" text REFERENCES "show"("id") ON DELETE SET NULL,
  "tour_id" text REFERENCES "tour"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "designer" text NOT NULL DEFAULT 'Unknown',
  "year" integer NOT NULL,
  "notes" text,
  "gradient" text NOT NULL DEFAULT 'midnight',
  "owned" boolean NOT NULL DEFAULT true,
  "image_url" text,
  "expresso_beans_id" integer,
  "editions" jsonb
);

CREATE TABLE IF NOT EXISTS "media_link" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "show_id" text NOT NULL REFERENCES "show"("id") ON DELETE CASCADE,
  "kind" text NOT NULL DEFAULT 'video',
  "label" text NOT NULL,
  "sublabel" text,
  "duration" text,
  "url" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "show_photo" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "show_id" text NOT NULL REFERENCES "show"("id") ON DELETE CASCADE,
  "caption" text NOT NULL DEFAULT '',
  "gradient" text NOT NULL DEFAULT 'midnight',
  "image_url" text
);

CREATE TABLE IF NOT EXISTS "collection" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "item_count" integer NOT NULL DEFAULT 0,
  "gradient" text NOT NULL DEFAULT 'midnight'
);
