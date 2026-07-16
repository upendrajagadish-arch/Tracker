-- Public leaderboard: open link where anyone can view top performers,
-- search by roll number, and jump to the full shared student profile.

CREATE OR REPLACE FUNCTION public.get_public_leaderboard(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_search text := NULLIF(trim(COALESCE(p_search, '')), '');
  v_total integer;
  v_rows jsonb;
BEGIN
  -- Make sure every active student has a share token so leaderboard rows
  -- can deep-link to the full public performance profile.
  UPDATE public.student_profiles
  SET share_token = md5(gen_random_uuid()::text || clock_timestamp()::text)
                 || md5(clock_timestamp()::text || gen_random_uuid()::text),
      is_shareable = true
  WHERE is_active = true
    AND (share_token IS NULL OR is_shareable = false);

  WITH ranked AS (
    SELECT
      s.id,
      s.roll_number,
      s.full_name,
      s.branch,
      s.batch,
      s.academic_batch,
      s.readiness_score,
      s.readiness_status,
      s.placement_status,
      s.communication_score,
      s.communication_grade,
      s.cgpa,
      s.share_token,
      COALESCE(snap.total_solved, 0) AS total_solved,
      COALESCE(snap.linked_count, 0) AS linked_count,
      DENSE_RANK() OVER (
        ORDER BY s.readiness_score DESC, COALESCE(s.cgpa, 0) DESC, s.roll_number ASC
      ) AS rank
    FROM public.student_profiles s
    LEFT JOIN public.student_coding_snapshots snap
      ON snap.student_profile_id = s.id
    WHERE s.is_active = true
  ),
  filtered AS (
    SELECT * FROM ranked
    WHERE v_search IS NULL
       OR roll_number ILIKE '%' || v_search || '%'
       OR full_name ILIKE '%' || v_search || '%'
  )
  SELECT
    (SELECT count(*) FROM filtered),
    COALESCE(
      jsonb_agg(row_data ORDER BY rank_order),
      '[]'::jsonb
    )
  INTO v_total, v_rows
  FROM (
    SELECT
      rank AS rank_order,
      jsonb_build_object(
        'rank', rank,
        'rollNumber', roll_number,
        'fullName', full_name,
        'branch', branch,
        'batch', batch,
        'academicBatch', academic_batch,
        'readinessScore', readiness_score,
        'readinessStatus', readiness_status,
        'placementStatus', placement_status,
        'communicationScore', communication_score,
        'communicationGrade', communication_grade,
        'cgpa', cgpa,
        'totalSolved', total_solved,
        'linkedCount', linked_count,
        'shareToken', share_token
      ) AS row_data
    FROM filtered
    ORDER BY rank, roll_number
    LIMIT v_limit OFFSET v_offset
  ) page;

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'limit', v_limit,
    'offset', v_offset,
    'generatedAt', now(),
    'rows', COALESCE(v_rows, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_leaderboard(text, integer, integer) TO anon, authenticated;
