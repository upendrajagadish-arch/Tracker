-- Run in Supabase SQL Editor if student tech stack / role interests return 400 errors.
-- Safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- Phase 2B: tech stack columns
ALTER TABLE public.student_tech_skills
  ADD COLUMN IF NOT EXISTS evidence_source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS added_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.student_role_interests
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.tech_skills
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Student dossier fields
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS platform_handles jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS projects_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Public student performance share links
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS share_token text,
  ADD COLUMN IF NOT EXISTS is_shareable boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_share_token_idx
  ON public.student_profiles(share_token)
  WHERE share_token IS NOT NULL;

-- Student coding profile snapshots
CREATE TABLE IF NOT EXISTS public.student_coding_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  platform_handles jsonb NOT NULL DEFAULT '{}'::jsonb,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_solved integer NOT NULL DEFAULT 0,
  linked_count integer NOT NULL DEFAULT 0,
  fetch_status text NOT NULL DEFAULT 'pending'
    CHECK (fetch_status IN ('pending', 'success', 'partial', 'failed', 'no_handles')),
  fetch_error text,
  fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_coding_snapshots_student_unique UNIQUE (student_profile_id)
);

CREATE INDEX IF NOT EXISTS student_coding_snapshots_fetched_at_idx
  ON public.student_coding_snapshots(fetched_at DESC);

ALTER TABLE public.student_coding_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff view student coding snapshots" ON public.student_coding_snapshots;
CREATE POLICY "staff view student coding snapshots"
  ON public.student_coding_snapshots FOR SELECT
  USING (public.has_placement_permission('students:view'));

DROP POLICY IF EXISTS "staff manage student coding snapshots" ON public.student_coding_snapshots;
CREATE POLICY "staff manage student coding snapshots"
  ON public.student_coding_snapshots FOR ALL
  USING (public.has_placement_permission('students:update'))
  WITH CHECK (public.has_placement_permission('students:update'));

-- Public student performance RPC (anon-safe token lookup)
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
