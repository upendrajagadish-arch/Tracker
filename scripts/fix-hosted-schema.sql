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
