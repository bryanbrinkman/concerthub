-- Custom collections become functional: a join table linking posters to
-- a user's collection (binder / wishlist / tour run).
-- Run in the Neon SQL Editor. Idempotent — safe to run more than once.

CREATE TABLE IF NOT EXISTS "collection_poster" (
  "collection_id" text NOT NULL REFERENCES "collection"("id") ON DELETE CASCADE,
  "poster_id" text NOT NULL REFERENCES "poster"("id") ON DELETE CASCADE,
  "added_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("collection_id", "poster_id")
);
