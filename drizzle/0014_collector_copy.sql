-- Copy-level collector fields + permanent badges.
-- Acquisition price and private notes are owner-only by design — the app
-- never renders them publicly. Run in the Neon SQL Editor. Idempotent.

CREATE TABLE IF NOT EXISTS "user_badge" (
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "badge" text NOT NULL,
  "awarded_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "badge")
);

ALTER TABLE "poster"
  ADD COLUMN IF NOT EXISTS "condition" text,
  ADD COLUMN IF NOT EXISTS "framed" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "acquired_on" date,
  ADD COLUMN IF NOT EXISTS "acquired_price" text,
  ADD COLUMN IF NOT EXISTS "private_notes" text;
