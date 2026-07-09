-- Distinguish show posters (a specific date/venue) from tour posters
-- (multiple dates, tied to a tour). Existing posters default to 'show'.
-- Run in the Neon SQL Editor. Idempotent — safe to run more than once.

ALTER TABLE "poster"
  ADD COLUMN IF NOT EXISTS "poster_type" text NOT NULL DEFAULT 'show';
