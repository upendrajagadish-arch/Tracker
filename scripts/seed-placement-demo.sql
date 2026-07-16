-- Sample placement catalog helpers only (no dummy students).
-- Run after migrations if you want starter tech skills.

insert into public.tech_skills (name, name_key, category) values
  ('Java', 'java', 'programming'),
  ('Python', 'python', 'programming'),
  ('React', 'react', 'frontend'),
  ('Node.js', 'nodejs', 'backend'),
  ('SQL', 'sql', 'database'),
  ('DSA', 'dsa', 'programming')
on conflict (name_key) do nothing;
