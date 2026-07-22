-- Backfill graduation_year / academic_batch for campaign registrants so dashboards count them.
-- Safe to re-run.

-- 1) Year-only academic_batch/batch like "2028" → graduation_year
UPDATE public.student_profiles sp
SET graduation_year = COALESCE(
  sp.graduation_year,
  NULLIF(substring(COALESCE(sp.academic_batch, sp.batch, '') FROM '^([0-9]{4})$'), '')::int
)
WHERE sp.is_active = true
  AND sp.graduation_year IS NULL
  AND COALESCE(sp.academic_batch, sp.batch, '') ~ '^[0-9]{4}$'
  AND COALESCE(sp.academic_batch, sp.batch, '')::int BETWEEN 2027 AND 2035;

-- 2) Range values like "2024-2028" → end year
UPDATE public.student_profiles sp
SET graduation_year = COALESCE(
  sp.graduation_year,
  NULLIF(substring(COALESCE(sp.academic_batch, sp.batch, '') FROM '([0-9]{4})[[:space:]]*$'), '')::int
)
WHERE sp.is_active = true
  AND sp.graduation_year IS NULL
  AND COALESCE(sp.academic_batch, sp.batch, '') ~ '^[0-9]{4}[[:space:]]*[-–][[:space:]]*[0-9]{4}$';

-- 3) Admission-year style "2024" → assume 4-year program
UPDATE public.student_profiles sp
SET graduation_year = COALESCE(
  sp.graduation_year,
  (NULLIF(substring(COALESCE(sp.academic_batch, sp.batch, '') FROM '^([0-9]{4})$'), '')::int + 4)
)
WHERE sp.is_active = true
  AND sp.graduation_year IS NULL
  AND COALESCE(sp.academic_batch, sp.batch, '') ~ '^[0-9]{4}$'
  AND COALESCE(sp.academic_batch, sp.batch, '')::int BETWEEN 2018 AND 2026;

-- 4) Roll-number fallback (24ME1A… → admission 2024 → pass-out 2028)
UPDATE public.student_profiles sp
SET graduation_year = COALESCE(
  sp.graduation_year,
  (2000 + NULLIF(substring(sp.roll_number FROM '^([0-9]{2})'), '')::int + 4)
)
WHERE sp.is_active = true
  AND sp.graduation_year IS NULL
  AND sp.roll_number ~ '^[0-9]{2}[A-Za-z]';

-- 5) Normalize academic_batch to admission-graduation range when graduation_year is known
UPDATE public.student_profiles sp
SET academic_batch = (sp.graduation_year - 4)::text || '-' || sp.graduation_year::text
WHERE sp.is_active = true
  AND sp.graduation_year IS NOT NULL
  AND (
    sp.academic_batch IS NULL
    OR btrim(sp.academic_batch) = ''
    OR sp.academic_batch ~ '^[0-9]{4}$'
  );

-- 6) Dashboard aggregate RPC should always count active students for staff
CREATE OR REPLACE FUNCTION public.get_placement_dashboard(p_batch text DEFAULT 'all')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cohort AS (
    SELECT *
    FROM public.student_profiles sp
    WHERE sp.is_active = true
      AND (
        p_batch = 'all'
        OR COALESCE(
          sp.graduation_year::text,
          substring(sp.academic_batch FROM '([0-9]{4})$'),
          substring(sp.batch FROM '([0-9]{4})$'),
          sp.batch
        ) = p_batch
      )
  ),
  student_counts AS (
    SELECT
      count(*)::int AS total_students,
      count(*) FILTER (WHERE readiness_score >= 60)::int AS above_60,
      count(*) FILTER (WHERE readiness_score >= 70)::int AS above_70,
      count(*) FILTER (WHERE readiness_score >= 80)::int AS above_80,
      count(*) FILTER (WHERE upper(placement_status) IN ('PLACED', 'OFFERED'))::int AS placed
    FROM cohort
  ),
  operational_counts AS (
    SELECT
      (SELECT count(*)::int FROM public.company_share_links csl
        WHERE csl.is_active
          AND (csl.expires_at IS NULL OR csl.expires_at > now())
          AND (p_batch = 'all' OR cardinality(csl.audience_batches) = 0 OR p_batch = ANY(csl.audience_batches))
      ) AS company_links,
      (SELECT count(DISTINCT pe.company_id)::int FROM public.placement_events pe
        WHERE pe.mode = 'on_campus' AND pe.status <> 'cancelled'
          AND (p_batch = 'all' OR cardinality(pe.audience_batches) = 0 OR p_batch = ANY(pe.audience_batches))
      ) AS on_campus_companies,
      (SELECT count(*)::int FROM public.placement_events pe
        WHERE pe.starts_at >= now() AND pe.status = 'scheduled'
          AND (p_batch = 'all' OR cardinality(pe.audience_batches) = 0 OR p_batch = ANY(pe.audience_batches))
      ) AS upcoming_drives
  )
  SELECT jsonb_build_object(
    'batch', p_batch,
    'totalStudents', sc.total_students,
    'above60', sc.above_60,
    'above70', sc.above_70,
    'above80', sc.above_80,
    'placed', sc.placed,
    'unplaced', greatest(0, sc.total_students - sc.placed),
    'placementPercentage', CASE WHEN sc.total_students = 0 THEN 0 ELSE round(sc.placed * 100.0 / sc.total_students)::int END,
    'companyLinks', oc.company_links,
    'onCampusCompanies', oc.on_campus_companies,
    'upcomingDrives', oc.upcoming_drives,
    'refreshedAt', now()
  )
  FROM student_counts sc CROSS JOIN operational_counts oc;
$$;

REVOKE ALL ON FUNCTION public.get_placement_dashboard(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_placement_dashboard(text) TO authenticated;
