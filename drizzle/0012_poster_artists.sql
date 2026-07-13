-- Poster artists (print designers) as a light shared entity, keyed by the
-- URL slug. Lets us record a designer's website once and show it across
-- their posterography. Populated from the add-poster form.
-- Run in the Neon SQL Editor. Idempotent — safe to run more than once.

CREATE TABLE IF NOT EXISTS "poster_artist" (
  "slug" text PRIMARY KEY,
  "name" text NOT NULL,
  "website" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
