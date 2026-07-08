-- Multi-performer shows: event fields on "show" + the show_performer
-- lineup table, with data migrated from the legacy single-artist column
-- and the old show_opener table.
-- Run in the Neon SQL Editor. Idempotent — safe to run more than once.

ALTER TABLE "show" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "show" ADD COLUMN IF NOT EXISTS "end_date" date;
ALTER TABLE "show" ADD COLUMN IF NOT EXISTS "event_type" text NOT NULL DEFAULT 'concert';
ALTER TABLE "show" ADD COLUMN IF NOT EXISTS "stage" text;
ALTER TABLE "show" ADD COLUMN IF NOT EXISTS "festival_id" text REFERENCES "show"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "show_performer" (
  "show_id" text NOT NULL REFERENCES "show"("id") ON DELETE CASCADE,
  "artist_id" text NOT NULL REFERENCES "artist"("id") ON DELETE CASCADE,
  "billing_role" text NOT NULL DEFAULT 'headliner',
  "billing_order" integer NOT NULL DEFAULT 1,
  "stage" text,
  "set_time" text,
  "setlist_fm_id" text,
  "setlist_fm_url" text,
  "source" text NOT NULL DEFAULT 'user',
  "confidence" text NOT NULL DEFAULT 'confirmed',
  PRIMARY KEY ("show_id", "artist_id")
);

-- Every existing show's artist becomes its headliner (billing order 1),
-- carrying the show-level setlist.fm link as their set.
INSERT INTO "show_performer"
  ("show_id", "artist_id", "billing_role", "billing_order",
   "setlist_fm_id", "setlist_fm_url", "source")
SELECT s."id", s."artist_id", 'headliner', 1,
       s."setlist_fm_id", s."setlist_fm_url", 'migration'
FROM "show" s
ON CONFLICT DO NOTHING;

-- Openers recorded via the 0004 table join the bill after the headliner.
INSERT INTO "show_performer"
  ("show_id", "artist_id", "billing_role", "billing_order", "source")
SELECT o."show_id", o."artist_id", 'opener', o."position" + 2, 'migration'
FROM "show_opener" o
ON CONFLICT DO NOTHING;

-- The legacy show_opener table is now unused (kept for safety; drop it
-- later with: DROP TABLE IF EXISTS "show_opener";)
