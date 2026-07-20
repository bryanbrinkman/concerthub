-- Variant → parent-design link for posters: foils, color ways, APs, and
-- other variants group beneath one parent print instead of fragmenting
-- the catalog. NULL = this poster IS the parent design (or standalone).
-- Run in the Neon SQL Editor. Idempotent — safe to run more than once.

ALTER TABLE "poster"
  ADD COLUMN IF NOT EXISTS "variant_of" text REFERENCES "poster"("id") ON DELETE SET NULL;
