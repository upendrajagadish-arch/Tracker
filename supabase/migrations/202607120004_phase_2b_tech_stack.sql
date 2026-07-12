-- Phase 2B: Tech Stack Tracking
-- Staff-managed skill tracking only. No assignments, tests, AI, platform sync, or HR room.

CREATE TABLE IF NOT EXISTS public.tech_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_key text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'OTHER',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tech_skills_category_check CHECK (
    category IN (
      'PROGRAMMING_LANGUAGE',
      'WEB_TECHNOLOGY',
      'DATABASE',
      'FRAMEWORK',
      'TOOL',
      'CLOUD',
      'DATA_ANALYTICS',
      'AI_ML',
      'CYBERSECURITY',
      'SOFT_SKILL',
      'OTHER'
    )
  )
);

ALTER TABLE public.tech_skills
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.student_tech_skills
  ADD COLUMN IF NOT EXISTS evidence_source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS added_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'student_tech_skills'
      AND constraint_name = 'student_tech_skills_proficiency_level_check'
  ) THEN
    ALTER TABLE public.student_tech_skills
      ADD CONSTRAINT student_tech_skills_proficiency_level_check
      CHECK (proficiency_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'beginner', 'intermediate', 'advanced'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'student_tech_skills'
      AND constraint_name = 'student_tech_skills_verification_status_check'
  ) THEN
    ALTER TABLE public.student_tech_skills
      ADD CONSTRAINT student_tech_skills_verification_status_check
      CHECK (verification_status IN (
        'SELF_DECLARED',
        'FACULTY_VERIFIED',
        'PERFORMANCE_VERIFIED',
        'RESUME_EVIDENCE',
        'GITHUB_EVIDENCE',
        'NOT_VERIFIED',
        'self_declared',
        'verified'
      ));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.student_role_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  interest_level text NOT NULL DEFAULT 'MEDIUM',
  readiness_level text NOT NULL DEFAULT 'LEARNING',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_profile_id, role_name),
  CONSTRAINT student_role_interests_interest_level_check CHECK (interest_level IN ('LOW', 'MEDIUM', 'HIGH')),
  CONSTRAINT student_role_interests_readiness_level_check CHECK (readiness_level IN ('NOT_READY', 'LEARNING', 'NEAR_READY', 'READY'))
);

ALTER TABLE public.student_role_interests
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_student_tech_skills_student ON public.student_tech_skills(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_student_tech_skills_skill ON public.student_tech_skills(tech_skill_id);
CREATE INDEX IF NOT EXISTS idx_student_tech_skills_status ON public.student_tech_skills(verification_status);
CREATE INDEX IF NOT EXISTS idx_student_role_interests_student ON public.student_role_interests(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_student_role_interests_role ON public.student_role_interests(role_name);

INSERT INTO public.tech_skills (name, name_key, category) VALUES
  ('C', 'c', 'PROGRAMMING_LANGUAGE'),
  ('C++', 'c-plus-plus', 'PROGRAMMING_LANGUAGE'),
  ('Java', 'java', 'PROGRAMMING_LANGUAGE'),
  ('Python', 'python', 'PROGRAMMING_LANGUAGE'),
  ('JavaScript', 'javascript', 'PROGRAMMING_LANGUAGE'),
  ('HTML', 'html', 'WEB_TECHNOLOGY'),
  ('CSS', 'css', 'WEB_TECHNOLOGY'),
  ('React', 'react', 'WEB_TECHNOLOGY'),
  ('Node.js', 'node-js', 'WEB_TECHNOLOGY'),
  ('Express.js', 'express-js', 'WEB_TECHNOLOGY'),
  ('MySQL', 'mysql', 'DATABASE'),
  ('PostgreSQL', 'postgresql', 'DATABASE'),
  ('MongoDB', 'mongodb', 'DATABASE'),
  ('Git', 'git', 'TOOL'),
  ('GitHub', 'github', 'TOOL'),
  ('VS Code', 'vs-code', 'TOOL'),
  ('Postman', 'postman', 'TOOL'),
  ('AWS', 'aws', 'CLOUD'),
  ('Azure', 'azure', 'CLOUD'),
  ('Google Cloud', 'google-cloud', 'CLOUD'),
  ('Excel', 'excel', 'DATA_ANALYTICS'),
  ('Power BI', 'power-bi', 'DATA_ANALYTICS'),
  ('SQL', 'sql', 'DATA_ANALYTICS'),
  ('Tableau', 'tableau', 'DATA_ANALYTICS'),
  ('Machine Learning', 'machine-learning', 'AI_ML'),
  ('Deep Learning', 'deep-learning', 'AI_ML'),
  ('NLP', 'nlp', 'AI_ML'),
  ('Networking', 'networking', 'CYBERSECURITY'),
  ('Ethical Hacking', 'ethical-hacking', 'CYBERSECURITY'),
  ('Cybersecurity Basics', 'cybersecurity-basics', 'CYBERSECURITY')
ON CONFLICT (name_key) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    is_active = true,
    updated_at = now();
