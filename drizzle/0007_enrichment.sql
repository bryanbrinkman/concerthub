-- Show enrichment engine: jobs, data candidates (with provenance), and
-- the provider response cache.
-- Run in the Neon SQL Editor. Idempotent — safe to run more than once.

CREATE TABLE IF NOT EXISTS "enrichment_job" (
  "id" text PRIMARY KEY,
  "show_id" text NOT NULL REFERENCES "show"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "status" text NOT NULL DEFAULT 'running',
  "detail" text,
  "candidate_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "data_candidate" (
  "id" text PRIMARY KEY,
  "show_id" text NOT NULL REFERENCES "show"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "candidate_type" text,
  "value_key" text NOT NULL,
  "value" jsonb NOT NULL,
  "provider" text NOT NULL,
  "source_url" text,
  "confidence" integer NOT NULL DEFAULT 20,
  "reasons" text[],
  "status" text NOT NULL DEFAULT 'pending',
  "fetched_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "candidate_unique_idx"
  ON "data_candidate" ("show_id", "kind", "value_key");

CREATE TABLE IF NOT EXISTS "provider_cache" (
  "id" text PRIMARY KEY,
  "provider" text NOT NULL,
  "query_key" text NOT NULL,
  "response" jsonb,
  "fetched_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "provider_cache_key_idx"
  ON "provider_cache" ("provider", "query_key");
