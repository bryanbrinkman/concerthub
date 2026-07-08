-- Structured edition dimensions: split the free-text "18" x 24"" string
-- into numeric widthIn / heightIn (inches) inside the editions jsonb.
-- Unparseable strings keep their legacy "dimensions" text as a fallback.
-- Run in the Neon SQL Editor. Idempotent — safe to run more than once.

UPDATE "poster"
SET "editions" = (
  SELECT jsonb_agg(
    CASE
      -- already migrated, or nothing to parse → unchanged
      WHEN ed ? 'widthIn' OR ed->>'dimensions' IS NULL THEN ed
      -- "W x H" (with optional quotes/units) → structured inches
      WHEN ed->>'dimensions' ~* '\d+(\.\d+)?[^x×0-9]{0,6}[x×]\s*\d' THEN
        (ed - 'dimensions') || jsonb_build_object(
          'widthIn',
          ((regexp_match(ed->>'dimensions', '(\d+\.?\d*)'))[1])::numeric,
          'heightIn',
          ((regexp_match(ed->>'dimensions', '[x×]\s*(\d+\.?\d*)'))[1])::numeric
        )
      -- unparseable free text → keep the legacy string as-is
      ELSE ed
    END
  )
  FROM jsonb_array_elements("editions") AS ed
)
WHERE "editions" IS NOT NULL
  AND jsonb_array_length("editions") > 0;
