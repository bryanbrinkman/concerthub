-- Username/password login columns on the Auth.js user table.
-- Run in the Neon SQL Editor. Idempotent — safe to run more than once.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "password_hash" text;
CREATE UNIQUE INDEX IF NOT EXISTS "user_username_unique" ON "user" ("username");
