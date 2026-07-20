-- Canonical poster designs: the Discogs split. poster_design is the shared
-- catalog record; each poster row is one collector's copy pointing at it
-- via design_id. Backfill groups existing copies by show + title + designer
-- with a deterministic md5 id, so re-running is a no-op and app writes
-- (which compute the same id) agree with the backfill.
-- PREREQUISITE: 0011 (poster_type). Run in the Neon SQL Editor. Idempotent.

CREATE TABLE IF NOT EXISTS "poster_design" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "designer" text NOT NULL DEFAULT 'Unknown',
  "year" integer,
  "show_id" text REFERENCES "show"("id") ON DELETE SET NULL,
  "tour_id" text REFERENCES "tour"("id") ON DELETE SET NULL,
  "poster_type" text NOT NULL DEFAULT 'show',
  "image_url" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "poster"
  ADD COLUMN IF NOT EXISTS "design_id" text REFERENCES "poster_design"("id") ON DELETE SET NULL;

-- One design per distinct (show, title, designer) group.
INSERT INTO "poster_design" ("id", "title", "designer", "year", "show_id", "tour_id", "poster_type", "image_url")
SELECT DISTINCT ON (md5(coalesce(p."show_id", '') || '|' || lower(btrim(p."title")) || '|' || lower(btrim(p."designer"))))
  md5(coalesce(p."show_id", '') || '|' || lower(btrim(p."title")) || '|' || lower(btrim(p."designer"))),
  p."title", p."designer", p."year", p."show_id", p."tour_id",
  coalesce(p."poster_type", 'show'), p."image_url"
FROM "poster" p
ON CONFLICT ("id") DO NOTHING;

-- Link every unlinked copy to its design.
UPDATE "poster" p
SET "design_id" = md5(coalesce(p."show_id", '') || '|' || lower(btrim(p."title")) || '|' || lower(btrim(p."designer")))
WHERE p."design_id" IS NULL;
