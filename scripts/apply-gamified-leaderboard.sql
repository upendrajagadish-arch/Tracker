-- Apply in Supabase SQL Editor to enable gamified Hall of Fame re-ranking.
-- Safe to re-run (CREATE OR REPLACE).

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
  WITH scored AS (
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
      s.aptitude_score,
      s.aptitude_grade,
      s.verbal_score,
      s.verbal_grade,
      s.codenow_score,
      s.codenow_grade,
      s.cgpa,
      s.share_token,
      COALESCE(snap.total_solved, 0) AS total_solved,
      COALESCE(snap.linked_count, 0) AS linked_count,
      GREATEST(
        0,
        LEAST(
          1000,
          ROUND(
            (
              COALESCE(s.communication_score, 0) * 0.25
              + COALESCE(s.aptitude_score, 0) * 0.20
              + COALESCE(s.verbal_score, 0) * 0.15
              + COALESCE(s.codenow_score, 0) * 0.15
              + COALESCE(s.readiness_score, 0) * 0.15
              + LEAST(100, COALESCE(snap.total_solved, 0)::numeric / 3.0) * 0.10
            ) * 10
          )::int
        )
      ) AS fame_xp
    FROM public.student_profiles s
    LEFT JOIN public.student_coding_snapshots snap
      ON snap.student_profile_id = s.id
    WHERE s.is_active = true
      AND s.is_shareable = true
      AND s.share_token IS NOT NULL
  ),
  ranked AS (
    SELECT
      scored.*,
      CASE
        WHEN fame_xp >= 950 THEN 'Hall of Fame'
        WHEN fame_xp >= 850 THEN 'Legend'
        WHEN fame_xp >= 700 THEN 'Elite'
        WHEN fame_xp >= 550 THEN 'Challenger'
        WHEN fame_xp >= 400 THEN 'Contender'
        ELSE 'Rookie'
      END AS fame_level,
      DENSE_RANK() OVER (
        ORDER BY
          fame_xp DESC,
          readiness_score DESC,
          COALESCE(communication_score, 0) DESC,
          COALESCE(cgpa, 0) DESC,
          roll_number ASC
      ) AS rank
    FROM scored
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
        'fameXp', fame_xp,
        'fameLevel', fame_level,
        'readinessScore', readiness_score,
        'readinessStatus', readiness_status,
        'placementStatus', placement_status,
        'communicationScore', communication_score,
        'communicationGrade', communication_grade,
        'aptitudeScore', aptitude_score,
        'aptitudeGrade', aptitude_grade,
        'verbalScore', verbal_score,
        'verbalGrade', verbal_grade,
        'codeNowScore', codenow_score,
        'codeNowGrade', codenow_grade,
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
