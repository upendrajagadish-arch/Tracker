-- Student dossier fields for platform handles and project summaries (TPO view)
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS platform_handles jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS projects_summary text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.student_profiles.platform_handles IS 'Per-platform usernames/handles for coding trace (leetcode, codeforces, etc.)';
COMMENT ON COLUMN public.student_profiles.projects_summary IS 'Free-text projects summary for placement dossier and resume books';
