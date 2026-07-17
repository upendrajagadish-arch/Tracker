-- Seeds demo students for Communication Dashboard testing (Gold / Silver / Bronze).
-- Creates 135 demo students across academic batches and branches.
--
-- Run in Supabase Dashboard → SQL Editor (paste this file, then Run).
-- Do NOT paste the .mjs file here — that is a Node.js script, not SQL.
--
-- To remove later, run: scripts/clear-communication-dashboard-demo-data.sql

BEGIN;

-- Remove any previous demo rows first
DELETE FROM public.communication_evaluations
WHERE student_profile_id IN (
  SELECT id FROM public.student_profiles
  WHERE roll_number LIKE 'DEMO_COMM_%'
);

DELETE FROM public.student_profiles
WHERE roll_number LIKE 'DEMO_COMM_%';

WITH batches AS (
  SELECT unnest(ARRAY[
    '2023-2027', '2024-2028', '2025-2029', '2026-2030', '2027-2031'
  ]) AS academic_batch
),
branches AS (
  SELECT unnest(ARRAY[
    'CSE', 'CSE-AI', 'AI&DS', 'AI&ML', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'
  ]) AS branch
),
combo AS (
  SELECT
    b.academic_batch,
    br.branch,
    row_number() OVER (ORDER BY b.academic_batch, br.branch, g.n) AS idx
  FROM batches b
  CROSS JOIN branches br
  CROSS JOIN generate_series(1, 3) AS g(n)
),
scored AS (
  SELECT
    c.*,
    'DEMO_COMM_' || lpad(c.idx::text, 4, '0') AS roll_number,
    'Demo Student ' || c.idx::text AS full_name,
    'demo' || c.idx::text || '@demo.local' AS email,
    CASE
      WHEN c.idx % 3 = 1 THEN (ARRAY[200, 220, 250])[((floor(c.idx / 3)::int % 3) + 1)]
      WHEN c.idx % 3 = 2 THEN (ARRAY[150, 175, 199])[((floor(c.idx / 3)::int % 3) + 1)]
      ELSE (ARRAY[0, 100, 149])[((floor(c.idx / 3)::int % 3) + 1)]
    END AS total_score,
    35 + ((c.idx * 7) % 66) AS readiness_score,
    round((6 + (c.idx % 35) / 10.0)::numeric, 2) AS cgpa,
    (c.idx % 5) AS active_backlogs
  FROM combo c
),
enriched AS (
  SELECT
    s.*,
    round((s.total_score / 250.0) * 100)::int AS percentage,
    CASE
      WHEN s.total_score >= 200 THEN 'A+'
      WHEN s.total_score >= 150 THEN 'B+'
      ELSE 'Needs Improvement'
    END AS grade,
    CASE
      WHEN s.total_score = 250 THEN 80
      WHEN s.total_score = 220 THEN 80
      WHEN s.total_score = 200 THEN 70
      WHEN s.total_score = 199 THEN 70
      WHEN s.total_score = 175 THEN 65
      WHEN s.total_score = 150 THEN 60
      WHEN s.total_score = 149 THEN 50
      WHEN s.total_score = 100 THEN 40
      WHEN s.total_score = 0 THEN 0
      ELSE least(80, round(s.total_score * 0.35)::int)
    END AS communication_proficiency_total,
    CASE
      WHEN s.total_score = 250 THEN 60
      WHEN s.total_score = 220 THEN 60
      WHEN s.total_score = 200 THEN 60
      WHEN s.total_score = 199 THEN 50
      WHEN s.total_score = 175 THEN 45
      WHEN s.total_score = 150 THEN 40
      WHEN s.total_score = 149 THEN 40
      WHEN s.total_score = 100 THEN 20
      WHEN s.total_score = 0 THEN 0
      ELSE least(60, round(s.total_score * 0.25)::int)
    END AS presentation_skills_total,
  CASE
      WHEN s.total_score = 250 THEN 110
      WHEN s.total_score = 220 THEN 80
      WHEN s.total_score = 200 THEN 70
      WHEN s.total_score = 199 THEN 79
      WHEN s.total_score = 175 THEN 65
      WHEN s.total_score = 150 THEN 50
      WHEN s.total_score = 149 THEN 59
      WHEN s.total_score = 100 THEN 40
      WHEN s.total_score = 0 THEN 0
      ELSE greatest(0, s.total_score
        - least(80, round(s.total_score * 0.35)::int)
        - least(60, round(s.total_score * 0.25)::int))
    END AS behavioural_skills_total,
    CASE
      WHEN s.readiness_score >= 85 THEN 'highly_ready'
      WHEN s.readiness_score >= 70 THEN 'ready'
      WHEN s.readiness_score >= 55 THEN 'developing'
      WHEN s.readiness_score >= 40 THEN 'needs_work'
      ELSE 'not_ready'
    END AS readiness_status,
    CASE
      WHEN s.readiness_score >= 85 THEN 'low'
      WHEN s.readiness_score >= 55 THEN 'medium'
      ELSE 'high'
    END AS risk_level,
    CASE
      WHEN s.readiness_score >= 90 THEN 'PLACED'
      WHEN s.readiness_score >= 80 THEN 'READY'
      WHEN s.readiness_score >= 70 THEN 'SHORTLISTED'
      WHEN s.readiness_score >= 55 THEN 'IN_TRAINING'
      ELSE 'NOT_STARTED'
    END AS placement_status,
    (now() - (s.idx || ' minutes')::interval) AS evaluation_date
  FROM scored s
),
inserted_profiles AS (
  INSERT INTO public.student_profiles (
    roll_number,
    full_name,
    email,
    phone,
    branch,
    batch,
    academic_batch,
    section,
    address,
    certifications_summary,
    internship_summary,
    cgpa,
    active_backlogs,
    placement_status,
    profile_completeness,
    readiness_score,
    readiness_status,
    risk_level,
    is_placement_eligible,
    communication_score,
    communication_grade,
    last_communication_evaluation_at,
    skills_summary,
    career_interest,
    platform_handles,
    projects_summary,
    is_active,
    is_shareable
  )
  SELECT
    e.roll_number,
    e.full_name,
    e.email,
    '',
    e.branch,
    e.academic_batch,
    e.academic_batch,
    'N/A',
    '',
    '',
    '',
    e.cgpa,
    e.active_backlogs,
    e.placement_status,
    e.readiness_score,
    e.readiness_score,
    e.readiness_status,
    e.risk_level,
    (e.readiness_score >= 70 OR e.placement_status = 'PLACED'),
    e.percentage,
    e.grade,
    e.evaluation_date,
    'Demo skills',
    'Demo interest',
    '{}'::jsonb,
    '',
    true,
    false
  FROM enriched e
  RETURNING id, roll_number
)
INSERT INTO public.communication_evaluations (
  student_profile_id,
  roll_number,
  student_name,
  department,
  email,
  source,
  evaluator_name,
  evaluator_role,
  evaluation_date,
  max_score,
  total_score,
  percentage,
  grade,
  communication_proficiency_total,
  presentation_skills_total,
  behavioural_skills_total,
  is_active
)
SELECT
  ip.id,
  e.roll_number,
  e.full_name,
  e.branch,
  e.email,
  'manual',
  'Demo Seeder',
  'tpo',
  e.evaluation_date,
  250,
  e.total_score,
  e.percentage,
  e.grade,
  e.communication_proficiency_total,
  e.presentation_skills_total,
  e.behavioural_skills_total,
  true
FROM inserted_profiles ip
JOIN enriched e ON e.roll_number = ip.roll_number;

COMMIT;
