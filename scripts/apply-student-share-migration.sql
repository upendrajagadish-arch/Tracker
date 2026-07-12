-- Public student performance share links (run in Supabase SQL Editor)
-- Safe to re-run.

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS share_token text,
  ADD COLUMN IF NOT EXISTS is_shareable boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_share_token_idx
  ON public.student_profiles(share_token)
  WHERE share_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_public_student_performance(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  snap record;
  cards jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 48 OR p_token !~ '^[a-f0-9]{48,64}$' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO s
  FROM public.student_profiles
  WHERE share_token = p_token
    AND is_shareable = true
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO snap
  FROM public.student_coding_snapshots
  WHERE student_profile_id = s.id;

  cards := COALESCE(snap.cards, '[]'::jsonb);

  RETURN jsonb_build_object(
    'fullName', s.full_name,
    'rollNumber', s.roll_number,
    'branch', s.branch,
    'batch', s.batch,
    'cgpa', s.cgpa,
    'readinessScore', s.readiness_score,
    'readinessStatus', s.readiness_status,
    'placementStatus', s.placement_status,
    'skillsSummary', s.skills_summary,
    'careerInterest', s.career_interest,
    'platformHandles', COALESCE(s.platform_handles, '{}'::jsonb),
    'cards', cards,
    'linkedCount', COALESCE(snap.linked_count, 0),
    'totalSolved', COALESCE(snap.total_solved, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_performance(text) TO anon, authenticated;
