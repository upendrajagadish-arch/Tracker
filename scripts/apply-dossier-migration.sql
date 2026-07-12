-- Run in Supabase SQL editor if platform_handles / projects_summary columns are missing
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS platform_handles jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS projects_summary text NOT NULL DEFAULT '';
