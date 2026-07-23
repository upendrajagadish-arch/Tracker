-- Year-wise public leaderboard + include all active students (score 0 included).
-- Fame XP priorities: Coding / CodeNow / Tech Stack (higher), then Comm / Aptitude / Verbal, plus Readiness.
-- Safe to re-run. Paste into Supabase SQL Editor or:
--   npx supabase db execute -f scripts/apply-year-wise-leaderboard.sql --linked

DROP FUNCTION IF EXISTS public.get_public_leaderboard(text, integer, integer);
DROP FUNCTION IF EXISTS public.get_public_leaderboard(text, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.get_public_leaderboard(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_year integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_search text := NULLIF(trim(COALESCE(p_search, '')), '');
  v_year integer := p_year;
  v_total integer;
  v_rows jsonb;
BEGIN
  WITH tech AS (
    SELECT
      sts.student_profile_id,
      COALESCE(ROUND(AVG(
        CASE UPPER(COALESCE(sts.proficiency_level, ''))
          WHEN 'ADVANCED' THEN 90
          WHEN 'EXPERT' THEN 90
          WHEN 'INTERMEDIATE' THEN 65
          WHEN 'BEGINNER' THEN 35
          ELSE 20
        END
      )), 0)::int AS tech_stack_score
    FROM public.student_tech_skills sts
    GROUP BY sts.student_profile_id
  ),
  scored AS (
    SELECT
      s.*,
      COALESCE(snap.total_solved, 0) AS total_solved,
      COALESCE(snap.linked_count, 0) AS linked_count,
      COALESCE(tech.tech_stack_score, 0) AS tech_stack_score,
      LEAST(100, COALESCE(snap.total_solved, 0)::numeric / 3.0) AS coding_score,
      COALESCE(
        s.graduation_year,
        NULLIF(substring(COALESCE(s.academic_batch, s.batch, '') from '([0-9]{4})[[:space:]]*$'), '')::int
      ) AS resolved_year,
      -- Higher: coding 20%, CodeNow 18%, tech 18%
      -- Then readiness 12%, comm 12%, aptitude 10%, verbal 10%
      GREATEST(0, LEAST(1000, ROUND((
        LEAST(100, COALESCE(snap.total_solved, 0)::numeric / 3.0) * 0.20
        + COALESCE(s.codenow_score, 0) * 0.18
        + COALESCE(tech.tech_stack_score, 0) * 0.18
        + COALESCE(s.readiness_score, 0) * 0.12
        + COALESCE(s.communication_score, 0) * 0.12
        + COALESCE(s.aptitude_score, 0) * 0.10
        + COALESCE(s.verbal_score, 0) * 0.10
      ) * 10)::int)) AS fame_xp
    FROM public.student_profiles s
    LEFT JOIN public.student_coding_snapshots snap ON snap.student_profile_id = s.id
    LEFT JOIN tech ON tech.student_profile_id = s.id
    WHERE s.is_active = true
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
        ORDER BY fame_xp DESC,
          coding_score DESC,
          COALESCE(codenow_score, 0) DESC,
          tech_stack_score DESC,
          readiness_score DESC,
          COALESCE(communication_score, 0) DESC,
          COALESCE(cgpa, 0) DESC,
          roll_number ASC
      ) AS rank
    FROM scored
    WHERE v_year IS NULL OR resolved_year = v_year
  ),
  filtered AS (
    SELECT * FROM ranked
    WHERE v_search IS NULL
      OR roll_number ILIKE '%' || v_search || '%'
      OR full_name ILIKE '%' || v_search || '%'
  )
  SELECT
    (SELECT count(*) FROM filtered),
    COALESCE(jsonb_agg(row_data ORDER BY rank_order), '[]'::jsonb)
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
        'graduationYear', resolved_year,
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
        'techStackScore', tech_stack_score,
        'codingScore', ROUND(coding_score)::int,
        'cgpa', cgpa,
        'totalSolved', total_solved,
        'linkedCount', linked_count,
        'shareToken', CASE
          WHEN is_shareable = true AND share_token IS NOT NULL THEN share_token
          ELSE NULL
        END
      ) AS row_data
    FROM filtered
    ORDER BY rank, roll_number
    LIMIT v_limit OFFSET v_offset
  ) page;

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'limit', v_limit,
    'offset', v_offset,
    'year', v_year,
    'generatedAt', now(),
    'rows', COALESCE(v_rows, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_leaderboard(text, integer, integer, integer)
  TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_leaderboard(text, integer, integer, integer) IS
  'Public year-wise leaderboard. Fame XP prioritizes coding, CodeNow, and tech stack.';
