-- Gallery walls: one hand-arranged poster layout per user.
-- Run in the Neon SQL Editor. Idempotent — safe to run more than once.

CREATE TABLE IF NOT EXISTS "gallery_wall" (
  "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "layout" jsonb NOT NULL,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
