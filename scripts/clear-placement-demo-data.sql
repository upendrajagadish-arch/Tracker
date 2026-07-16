-- Wipe student profiles and placement demo/dummy data.
-- Safe to re-run. Does NOT delete auth users or staff placement_user_profiles.
-- Run in Supabase SQL editor, or via: node scripts/clear-placement-demo-data.mjs

BEGIN;

-- Campaign tokens cascade from campaigns; students cascade from student_profiles.
DELETE FROM public.student_update_tokens;
DELETE FROM public.student_update_campaigns;

-- Child student tables cascade on student_profiles delete, but clear explicitly first for clarity.
DELETE FROM public.student_resumes;
DELETE FROM public.student_tech_skills;
DELETE FROM public.student_role_interests;
DELETE FROM public.readiness_snapshots;
DELETE FROM public.company_match_snapshots;
DELETE FROM public.resume_book_student_snapshots;
DELETE FROM public.student_coding_snapshots;
DELETE FROM public.communication_evaluations;
DELETE FROM public.aptitude_scores;
DELETE FROM public.verbal_scores;
DELETE FROM public.codenow_challenge_scores;
DELETE FROM public.codenow_profiles;

DELETE FROM public.student_profiles;

-- Demo interview rows (not FK to student_profiles)
DELETE FROM public.placement_interviews;

-- Resume books
DELETE FROM public.resume_book_snapshots;

-- Demo companies + requirements
DELETE FROM public.company_requirements;
DELETE FROM public.companies;

COMMIT;

-- Optional: also remove seeded catalog skills (uncomment if you want a fully empty skill catalog)
-- DELETE FROM public.tech_skills;
