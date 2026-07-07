-- Multiple images per poster: image_url stays the cover, image_urls holds
-- additional detail shots (numbering, signature, foil, condition).
-- Apply like the others: `npm run db:push`, or paste into the Neon
-- console SQL Editor and run. Idempotent.

ALTER TABLE "poster" ADD COLUMN IF NOT EXISTS "image_urls" text[];
