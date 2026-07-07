-- Trading Post: collectors expressing interest in each other's prints.
-- Apply the same way as 0000_init.sql: `npm run db:push`, or paste into
-- the Neon console SQL Editor and run. Idempotent.

CREATE TABLE IF NOT EXISTS "poster_interest" (
  "id" text PRIMARY KEY,
  "poster_id" text NOT NULL REFERENCES "poster"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "note" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "poster_interest_unique_idx"
  ON "poster_interest" ("poster_id", "user_id");
