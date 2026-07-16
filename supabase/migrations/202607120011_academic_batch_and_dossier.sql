-- Academic Batch (first-class) + dossier fields for student self-service

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS admission_year int,
  ADD COLUMN IF NOT EXISTS academic_batch text,
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS certifications_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS internship_summary text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS student_profiles_academic_batch_idx
  ON public.student_profiles (academic_batch)
  WHERE academic_batch IS NOT NULL AND academic_batch <> '';

CREATE INDEX IF NOT EXISTS student_profiles_branch_academic_batch_idx
  ON public.student_profiles (branch, academic_batch);

-- Backfill academic batch (4-year program when only graduation year is known)
UPDATE public.student_profiles
SET
  admission_year = COALESCE(
    admission_year,
    CASE
      WHEN batch ~ '^\d{4}\s*[-–]\s*\d{4}$' THEN
        (regexp_match(batch, '^(\d{4})'))[1]::int
      WHEN graduation_year IS NOT NULL THEN graduation_year - 4
      WHEN batch ~ '^\d{4}$' THEN batch::int - 4
      ELSE NULL
    END
  ),
  graduation_year = COALESCE(
    graduation_year,
    CASE
      WHEN batch ~ '^\d{4}\s*[-–]\s*\d{4}$' THEN
        (regexp_match(batch, '(\d{4})$'))[1]::int
      WHEN batch ~ '^\d{4}$' THEN batch::int
      ELSE NULL
    END
  )
WHERE admission_year IS NULL OR graduation_year IS NULL;

UPDATE public.student_profiles
SET academic_batch = admission_year::text || '-' || graduation_year::text
WHERE admission_year IS NOT NULL
  AND graduation_year IS NOT NULL
  AND (academic_batch IS NULL OR academic_batch = '');

-- Keep legacy batch in sync for existing filters
UPDATE public.student_profiles
SET batch = academic_batch
WHERE academic_batch IS NOT NULL
  AND academic_batch <> ''
  AND (batch IS NULL OR batch = '' OR batch ~ '^\d{4}$' OR batch ~ '^\d{4}\s*[-–]\s*\d{4}$');
