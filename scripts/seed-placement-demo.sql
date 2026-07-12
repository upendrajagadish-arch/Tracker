-- Sample placement data (run after migrations + auth users exist)
-- Link placement_user_profiles.id to auth.users.id manually per role.

insert into public.tech_skills (name, name_key, category) values
  ('Java', 'java', 'programming'),
  ('Python', 'python', 'programming'),
  ('React', 'react', 'frontend'),
  ('Node.js', 'nodejs', 'backend'),
  ('SQL', 'sql', 'database'),
  ('DSA', 'dsa', 'programming')
on conflict (name_key) do nothing;

insert into public.companies (name, industry, location, contact_email, is_active) values
  ('TechCorp India', 'IT Services', 'Bangalore', 'campus@techcorp.example', true),
  ('FinServe Labs', 'Fintech', 'Mumbai', 'hire@finserve.example', true)
on conflict do nothing;

-- Example student (adjust user_id after creating auth user)
insert into public.student_profiles (
  roll_number, full_name, email, branch, batch, cgpa, readiness_score, readiness_status, placement_status
) values
  ('CS2024001', 'Alex Kumar', 'alex@college.example', 'CSE', '2025', 8.2, 75, 'placement_ready', 'READY'),
  ('CS2024002', 'Priya Sharma', 'priya@college.example', 'CSE', '2025', 9.1, 88, 'highly_ready', 'SHORTLISTED')
on conflict (roll_number) do nothing;

insert into public.placement_interviews (roll_number, student_name, technical_score, communication_score, overall_score, level)
values
  ('CS2024001', 'Alex Kumar', 8.0, 7.5, 7.8, 'Good'),
  ('CS2024002', 'Priya Sharma', 9.2, 8.8, 9.0, 'Excellent');
