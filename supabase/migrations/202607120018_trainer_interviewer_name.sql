-- Trainer / interviewer name on tech stack skill assessments (staff-only display).
-- Safe to re-run.

ALTER TABLE public.student_tech_skills
  ADD COLUMN IF NOT EXISTS assessed_by_name text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.student_tech_skills.assessed_by_name IS
  'Free-text trainer or interviewer name who assessed this skill (admin/faculty only; not on public share).';
