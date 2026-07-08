-- Collection states for posters: own / want / trade / sell.
-- Apply like the others: `npm run db:push`, or paste into the Neon
-- console SQL Editor and run. Idempotent.

ALTER TABLE "poster" ADD COLUMN IF NOT EXISTS "state" text NOT NULL DEFAULT 'own';
