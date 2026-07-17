-- Apply in Supabase SQL Editor if migrations are not pushed yet.
-- Adds assessed_by_name to student_tech_skills for trainer/interviewer tracking.

ALTER TABLE public.student_tech_skills
  ADD COLUMN IF NOT EXISTS assessed_by_name text NOT NULL DEFAULT '';
