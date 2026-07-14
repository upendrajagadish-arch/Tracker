-- Aptitude / verbal scores + enhanced public share RPC (read-only allowlist)

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS aptitude_score int,
  ADD COLUMN IF NOT EXISTS aptitude_grade text,
  ADD COLUMN IF NOT EXISTS last_aptitude_at timestamptz,
  ADD COLUMN IF NOT EXISTS verbal_score int,
  ADD COLUMN IF NOT EXISTS verbal_grade text,
  ADD COLUMN IF NOT EXISTS last_verbal_at timestamptz;

CREATE TABLE IF NOT EXISTS public.aptitude_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  roll_number text NOT NULL DEFAULT '',
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 100 CHECK (max_score > 0),
  percentage int NOT NULL DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  grade text NOT NULL DEFAULT 'Needs Improvement',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'bulk_upload')),
  test_name text NOT NULL DEFAULT '',
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  category_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aptitude_scores_score_range CHECK (score >= 0 AND score <= max_score)
);

CREATE TABLE IF NOT EXISTS public.verbal_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  roll_number text NOT NULL DEFAULT '',
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 100 CHECK (max_score > 0),
  percentage int NOT NULL DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  grade text NOT NULL DEFAULT 'Needs Improvement',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'bulk_upload')),
  test_name text NOT NULL DEFAULT '',
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  category_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verbal_scores_score_range CHECK (score >= 0 AND score <= max_score)
);

CREATE INDEX IF NOT EXISTS aptitude_scores_student_idx ON public.aptitude_scores(student_profile_id);
CREATE INDEX IF NOT EXISTS aptitude_scores_roll_idx ON public.aptitude_scores(roll_number);
CREATE INDEX IF NOT EXISTS aptitude_scores_date_idx ON public.aptitude_scores(evaluated_at DESC);
CREATE INDEX IF NOT EXISTS verbal_scores_student_idx ON public.verbal_scores(student_profile_id);
CREATE INDEX IF NOT EXISTS verbal_scores_roll_idx ON public.verbal_scores(roll_number);
CREATE INDEX IF NOT EXISTS verbal_scores_date_idx ON public.verbal_scores(evaluated_at DESC);

DROP TRIGGER IF EXISTS aptitude_scores_set_updated_at ON public.aptitude_scores;
CREATE TRIGGER aptitude_scores_set_updated_at
  BEFORE UPDATE ON public.aptitude_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS verbal_scores_set_updated_at ON public.verbal_scores;
CREATE TRIGGER verbal_scores_set_updated_at
  BEFORE UPDATE ON public.verbal_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.aptitude_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verbal_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff view aptitude scores" ON public.aptitude_scores;
CREATE POLICY "staff view aptitude scores"
  ON public.aptitude_scores FOR SELECT
  USING (public.has_placement_permission('students:view'));

DROP POLICY IF EXISTS "tpo admin manage aptitude scores" ON public.aptitude_scores;
CREATE POLICY "tpo admin manage aptitude scores"
  ON public.aptitude_scores FOR ALL
  USING (public.current_app_role() IN ('admin', 'tpo'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo'));

DROP POLICY IF EXISTS "staff view verbal scores" ON public.verbal_scores;
CREATE POLICY "staff view verbal scores"
  ON public.verbal_scores FOR SELECT
  USING (public.has_placement_permission('students:view'));

DROP POLICY IF EXISTS "tpo admin manage verbal scores" ON public.verbal_scores;
CREATE POLICY "tpo admin manage verbal scores"
  ON public.verbal_scores FOR ALL
  USING (public.current_app_role() IN ('admin', 'tpo'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo'));

-- Enhanced public share payload (no IDs, notes, or staff controls)
CREATE OR REPLACE FUNCTION public.get_public_student_performance(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  snap record;
  comm record;
  apt record;
  verb record;
  cards jsonb;
  criteria jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 48 OR p_token !~ '^[a-f0-9]{48,64}$' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO s
  FROM public.student_profiles
  WHERE share_token = p_token
    AND is_shareable = true
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO snap
  FROM public.student_coding_snapshots
  WHERE student_profile_id = s.id;

  cards := COALESCE(snap.cards, '[]'::jsonb);

  SELECT * INTO comm
  FROM public.communication_evaluations
  WHERE student_profile_id = s.id
    AND is_active = true
  ORDER BY evaluation_date DESC
  LIMIT 1;

  SELECT * INTO apt
  FROM public.aptitude_scores
  WHERE student_profile_id = s.id
    AND is_active = true
  ORDER BY evaluated_at DESC
  LIMIT 1;

  SELECT * INTO verb
  FROM public.verbal_scores
  WHERE student_profile_id = s.id
    AND is_active = true
  ORDER BY evaluated_at DESC
  LIMIT 1;

  IF comm.id IS NOT NULL THEN
    criteria := jsonb_build_object(
      'open_body_posture_smile', comm.open_body_posture_smile,
      'gestures_eye_contact', comm.gestures_eye_contact,
      'fluency_in_english', comm.fluency_in_english,
      'rate_of_speech', comm.rate_of_speech,
      'pronunciation_clarity', comm.pronunciation_clarity,
      'voice_modulation', comm.voice_modulation,
      'listening_skills', comm.listening_skills,
      'body_language', comm.body_language,
      'explanation_skills', comm.explanation_skills,
      'energy_enthusiasm', comm.energy_enthusiasm,
      'content_quality_ideas', comm.content_quality_ideas,
      'subject_knowledge', comm.subject_knowledge,
      'thought_process_creativity', comm.thought_process_creativity,
      'audience_orientation', comm.audience_orientation,
      'courtesy_politeness', comm.courtesy_politeness,
      'grooming', comm.grooming,
      'confidence', comm.confidence,
      'professionalism', comm.professionalism,
      'initiative', comm.initiative,
      'leadership_skills', comm.leadership_skills,
      'teamwork', comm.teamwork,
      'analytical_critical_thinking', comm.analytical_critical_thinking,
      'problem_solving_ability', comm.problem_solving_ability,
      'persuasiveness', comm.persuasiveness,
      'time_management', comm.time_management
    );
  ELSE
    criteria := NULL;
  END IF;

  RETURN jsonb_build_object(
    'fullName', s.full_name,
    'rollNumber', s.roll_number,
    'branch', s.branch,
    'batch', s.batch,
    'graduationYear', s.graduation_year,
    'cgpa', s.cgpa,
    'headline', NULLIF(trim(COALESCE(s.career_interest, '')), ''),
    'skillsSummary', s.skills_summary,
    'careerInterest', s.career_interest,
    'githubUrl', NULLIF(trim(COALESCE(s.github_url, '')), ''),
    'readinessScore', s.readiness_score,
    'readinessStatus', s.readiness_status,
    'placementStatus', s.placement_status,
    'platformHandles', COALESCE(s.platform_handles, '{}'::jsonb),
    'cards', cards,
    'linkedCount', COALESCE(snap.linked_count, 0),
    'totalSolved', COALESCE(snap.total_solved, 0),
    'codingSyncedAt', snap.fetched_at,
    'communication', CASE
      WHEN comm.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'totalScore', comm.total_score,
        'maxScore', COALESCE(comm.max_score, 250),
        'percentage', comm.percentage,
        'grade', comm.grade,
        'evaluatedAt', comm.evaluation_date,
        'proficiencyTotal', comm.communication_proficiency_total,
        'presentationTotal', comm.presentation_skills_total,
        'behaviouralTotal', comm.behavioural_skills_total,
        'criteria', criteria
      )
    END,
    'aptitude', CASE
      WHEN apt.id IS NULL AND s.aptitude_score IS NULL THEN NULL
      WHEN apt.id IS NULL THEN jsonb_build_object(
        'score', NULL,
        'maxScore', NULL,
        'percentage', s.aptitude_score,
        'grade', s.aptitude_grade,
        'testName', NULL,
        'evaluatedAt', s.last_aptitude_at,
        'categoryBreakdown', '{}'::jsonb
      )
      ELSE jsonb_build_object(
        'score', apt.score,
        'maxScore', apt.max_score,
        'percentage', apt.percentage,
        'grade', apt.grade,
        'testName', apt.test_name,
        'evaluatedAt', apt.evaluated_at,
        'categoryBreakdown', COALESCE(apt.category_breakdown, '{}'::jsonb)
      )
    END,
    'verbal', CASE
      WHEN verb.id IS NULL AND s.verbal_score IS NULL THEN NULL
      WHEN verb.id IS NULL THEN jsonb_build_object(
        'score', NULL,
        'maxScore', NULL,
        'percentage', s.verbal_score,
        'grade', s.verbal_grade,
        'testName', NULL,
        'evaluatedAt', s.last_verbal_at,
        'categoryBreakdown', '{}'::jsonb
      )
      ELSE jsonb_build_object(
        'score', verb.score,
        'maxScore', verb.max_score,
        'percentage', verb.percentage,
        'grade', verb.grade,
        'testName', verb.test_name,
        'evaluatedAt', verb.evaluated_at,
        'categoryBreakdown', COALESCE(verb.category_breakdown, '{}'::jsonb)
      )
    END,
    'generatedAt', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_performance(text) TO anon, authenticated;
