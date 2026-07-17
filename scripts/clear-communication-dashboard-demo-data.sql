-- Clears ONLY demo rows created by seed-communication-dashboard-demo-data.sql
-- Safe to re-run. Does NOT delete real students.
--
-- Run in Supabase Dashboard → SQL Editor (paste this file, then Run).
-- Do NOT paste the .mjs file here — that is a Node.js script, not SQL.

BEGIN;

DELETE FROM public.communication_evaluations
WHERE student_profile_id IN (
  SELECT id FROM public.student_profiles
  WHERE roll_number LIKE 'DEMO_COMM_%'
);

DELETE FROM public.student_profiles
WHERE roll_number LIKE 'DEMO_COMM_%';

COMMIT;
