-- Openers / support acts on a show's bill.
-- Run in the Neon SQL Editor. Idempotent — safe to run more than once.

CREATE TABLE IF NOT EXISTS "show_opener" (
  "show_id" text NOT NULL REFERENCES "show"("id") ON DELETE CASCADE,
  "artist_id" text NOT NULL REFERENCES "artist"("id") ON DELETE CASCADE,
  "position" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("show_id", "artist_id")
);
