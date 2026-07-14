-- Communication Evaluation (25 criteria × 10 = 250 marks)
-- Replaces any earlier 60-mark schema if present.

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS communication_score int,
  ADD COLUMN IF NOT EXISTS communication_grade text,
  ADD COLUMN IF NOT EXISTS last_communication_evaluation_at timestamptz;

DROP TABLE IF EXISTS public.communication_evaluations CASCADE;

CREATE TABLE public.communication_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  roll_number text NOT NULL DEFAULT '',
  student_name text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',

  -- Communication Proficiency (80)
  open_body_posture_smile int NOT NULL DEFAULT 0 CHECK (open_body_posture_smile BETWEEN 0 AND 10),
  gestures_eye_contact int NOT NULL DEFAULT 0 CHECK (gestures_eye_contact BETWEEN 0 AND 10),
  fluency_in_english int NOT NULL DEFAULT 0 CHECK (fluency_in_english BETWEEN 0 AND 10),
  rate_of_speech int NOT NULL DEFAULT 0 CHECK (rate_of_speech BETWEEN 0 AND 10),
  pronunciation_clarity int NOT NULL DEFAULT 0 CHECK (pronunciation_clarity BETWEEN 0 AND 10),
  voice_modulation int NOT NULL DEFAULT 0 CHECK (voice_modulation BETWEEN 0 AND 10),
  listening_skills int NOT NULL DEFAULT 0 CHECK (listening_skills BETWEEN 0 AND 10),
  body_language int NOT NULL DEFAULT 0 CHECK (body_language BETWEEN 0 AND 10),
  communication_proficiency_total int NOT NULL DEFAULT 0 CHECK (communication_proficiency_total BETWEEN 0 AND 80),

  -- Presentation Skills (60)
  explanation_skills int NOT NULL DEFAULT 0 CHECK (explanation_skills BETWEEN 0 AND 10),
  energy_enthusiasm int NOT NULL DEFAULT 0 CHECK (energy_enthusiasm BETWEEN 0 AND 10),
  content_quality_ideas int NOT NULL DEFAULT 0 CHECK (content_quality_ideas BETWEEN 0 AND 10),
  subject_knowledge int NOT NULL DEFAULT 0 CHECK (subject_knowledge BETWEEN 0 AND 10),
  thought_process_creativity int NOT NULL DEFAULT 0 CHECK (thought_process_creativity BETWEEN 0 AND 10),
  audience_orientation int NOT NULL DEFAULT 0 CHECK (audience_orientation BETWEEN 0 AND 10),
  presentation_skills_total int NOT NULL DEFAULT 0 CHECK (presentation_skills_total BETWEEN 0 AND 60),

  -- Behavioural Skills (110)
  courtesy_politeness int NOT NULL DEFAULT 0 CHECK (courtesy_politeness BETWEEN 0 AND 10),
  grooming int NOT NULL DEFAULT 0 CHECK (grooming BETWEEN 0 AND 10),
  confidence int NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 10),
  professionalism int NOT NULL DEFAULT 0 CHECK (professionalism BETWEEN 0 AND 10),
  initiative int NOT NULL DEFAULT 0 CHECK (initiative BETWEEN 0 AND 10),
  leadership_skills int NOT NULL DEFAULT 0 CHECK (leadership_skills BETWEEN 0 AND 10),
  teamwork int NOT NULL DEFAULT 0 CHECK (teamwork BETWEEN 0 AND 10),
  analytical_critical_thinking int NOT NULL DEFAULT 0 CHECK (analytical_critical_thinking BETWEEN 0 AND 10),
  problem_solving_ability int NOT NULL DEFAULT 0 CHECK (problem_solving_ability BETWEEN 0 AND 10),
  persuasiveness int NOT NULL DEFAULT 0 CHECK (persuasiveness BETWEEN 0 AND 10),
  time_management int NOT NULL DEFAULT 0 CHECK (time_management BETWEEN 0 AND 10),
  behavioural_skills_total int NOT NULL DEFAULT 0 CHECK (behavioural_skills_total BETWEEN 0 AND 110),

  total_score int NOT NULL DEFAULT 0 CHECK (total_score BETWEEN 0 AND 250),
  max_score int NOT NULL DEFAULT 250,
  percentage int NOT NULL DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  grade text NOT NULL DEFAULT 'Needs Improvement'
    CHECK (grade IN ('A+', 'A', 'B+', 'B', 'C', 'Needs Improvement')),
  evaluator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  evaluator_name text NOT NULL DEFAULT '',
  evaluator_role text NOT NULL DEFAULT '',
  evaluation_date timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'bulk_upload')),
  notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX communication_evaluations_student_idx ON public.communication_evaluations(student_profile_id);
CREATE INDEX communication_evaluations_roll_idx ON public.communication_evaluations(roll_number);
CREATE INDEX communication_evaluations_grade_idx ON public.communication_evaluations(grade);
CREATE INDEX communication_evaluations_date_idx ON public.communication_evaluations(evaluation_date DESC);
CREATE INDEX communication_evaluations_total_idx ON public.communication_evaluations(total_score);
CREATE INDEX IF NOT EXISTS student_profiles_communication_score_idx ON public.student_profiles(communication_score);

DROP TRIGGER IF EXISTS communication_evaluations_set_updated_at ON public.communication_evaluations;
CREATE TRIGGER communication_evaluations_set_updated_at
  BEFORE UPDATE ON public.communication_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.communication_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff view communication evaluations" ON public.communication_evaluations;
CREATE POLICY "staff view communication evaluations"
  ON public.communication_evaluations FOR SELECT
  USING (public.has_placement_permission('students:view'));

DROP POLICY IF EXISTS "tpo admin manage communication evaluations" ON public.communication_evaluations;
CREATE POLICY "tpo admin manage communication evaluations"
  ON public.communication_evaluations FOR ALL
  USING (public.current_app_role() IN ('admin', 'tpo'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo'));
