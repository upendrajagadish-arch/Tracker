-- Auto-refresh readiness from full student profile eligibility scan.
-- Credits: resume, LinkedIn, coding platforms, CGPA, skills text, projects, certs,
-- CodeNow / aptitude / verbal — not only formal tech-stack or communication evaluations.
-- Safe to re-run. Mirrors src/lib/placementReadiness.ts

CREATE OR REPLACE FUNCTION public.refresh_student_readiness(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.student_profiles%ROWTYPE;
  resume_row public.student_resumes%ROWTYPE;
  tech_avg numeric := 0;
  tech_count int := 0;
  tech_score numeric := 0;
  resume_score numeric := 0;
  profile_score numeric := 0;
  academic_score numeric := 50;
  communication_score numeric := 28;
  technical_score numeric := 18;
  interview_tech numeric := 0;
  interview_comm numeric := 0;
  interview_n int := 0;
  filled int := 0;
  checklist int := 14;
  platform_count int := 0;
  total_solved int := 0;
  from_platforms numeric := 0;
  from_solved numeric := 0;
  code_now numeric := 0;
  aptitude numeric := 0;
  primary_sig numeric := 0;
  secondary_avg numeric := 0;
  signal_sum numeric := 0;
  signal_n int := 0;
  skills_parts int := 0;
  overall numeric := 0;
  status text := 'not_ready';
  risk text := 'medium';
  risk_points int := 0;
  has_resume boolean := false;
  has_github boolean := false;
  has_linkedin boolean := false;
  has_skills_text boolean := false;
BEGIN
  IF p_student_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'student id required');
  END IF;

  SELECT * INTO s FROM public.student_profiles WHERE id = p_student_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'student not found');
  END IF;

  SELECT * INTO resume_row
  FROM public.student_resumes
  WHERE student_profile_id = p_student_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  has_resume := resume_row.id IS NOT NULL;

  SELECT COALESCE((
    SELECT snap.total_solved
    FROM public.student_coding_snapshots snap
    WHERE snap.student_profile_id = p_student_id
    LIMIT 1
  ), 0)
  INTO total_solved;

  SELECT count(*) INTO platform_count
  FROM jsonb_each_text(COALESCE(s.platform_handles, '{}'::jsonb))
  WHERE NULLIF(trim(value), '') IS NOT NULL;

  has_github := NULLIF(trim(COALESCE(s.github_url, '')), '') IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM jsonb_each_text(COALESCE(s.platform_handles, '{}'::jsonb)) e
      WHERE e.key = 'github' AND NULLIF(trim(e.value), '') IS NOT NULL
    );
  IF has_github AND platform_count = 0 THEN
    platform_count := 1;
  ELSIF has_github THEN
    -- github_url may duplicate platform_handles.github; count is fine either way
    NULL;
  END IF;

  has_linkedin := NULLIF(trim(COALESCE(s.linkedin_url, '')), '') IS NOT NULL;
  has_skills_text := NULLIF(trim(COALESCE(s.skills_summary, '')), '') IS NOT NULL;

  SELECT
    COALESCE(AVG(
      CASE lower(COALESCE(proficiency_level, ''))
        WHEN 'expert' THEN 100
        WHEN 'advanced' THEN 85
        WHEN 'intermediate' THEN 70
        WHEN 'beginner' THEN 50
        WHEN 'novice' THEN 35
        ELSE 50
      END
      + CASE WHEN verification_status = 'verified' THEN 10 ELSE 0 END
    ), 0),
    count(*)
  INTO tech_avg, tech_count
  FROM public.student_tech_skills
  WHERE student_profile_id = p_student_id;

  IF tech_count > 0 THEN
    tech_score := LEAST(100, tech_avg + LEAST(15, tech_count * 3));
  ELSIF has_skills_text THEN
    skills_parts := GREATEST(
      1,
      cardinality(regexp_split_to_array(trim(s.skills_summary), '[,;/|•\n]+'))
    );
    tech_score := LEAST(100, 35 + LEAST(45, skills_parts * 8));
  END IF;

  IF has_resume THEN
    resume_score := CASE WHEN COALESCE(resume_row.resume_score, 0) > 0 THEN resume_row.resume_score ELSE 50 END;
    IF resume_row.review_status = 'approved' THEN resume_score := resume_score + 10; END IF;
    IF resume_row.review_status = 'needs_revision' THEN resume_score := resume_score + 5; END IF;
    IF resume_row.review_status = 'rejected' THEN resume_score := resume_score - 20; END IF;
    IF resume_row.ats_friendly THEN resume_score := resume_score + 5; END IF;
    resume_score := GREATEST(0, LEAST(100, resume_score));
  END IF;

  filled := 0;
  IF NULLIF(trim(COALESCE(s.full_name, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  IF NULLIF(trim(COALESCE(s.email, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  IF NULLIF(trim(COALESCE(s.phone, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  IF NULLIF(trim(COALESCE(s.branch, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  IF NULLIF(trim(COALESCE(s.batch, '')), '') IS NOT NULL OR s.graduation_year IS NOT NULL THEN filled := filled + 1; END IF;
  IF s.cgpa IS NOT NULL THEN filled := filled + 1; END IF;
  IF has_linkedin THEN filled := filled + 1; END IF;
  IF has_github THEN filled := filled + 1; END IF;
  IF platform_count > 0 THEN filled := filled + 1; END IF;
  IF has_skills_text THEN filled := filled + 1; END IF;
  IF NULLIF(trim(COALESCE(s.career_interest, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  IF NULLIF(trim(COALESCE(s.portfolio_url, '')), '') IS NOT NULL
     OR NULLIF(trim(COALESCE(s.projects_summary, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  IF NULLIF(trim(COALESCE(s.certifications_summary, '')), '') IS NOT NULL
     OR NULLIF(trim(COALESCE(s.internship_summary, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  IF has_resume THEN filled := filled + 1; END IF;
  profile_score := ROUND((filled::numeric / checklist) * 100);

  IF s.cgpa IS NOT NULL THEN
    IF s.cgpa >= 9 THEN academic_score := 100;
    ELSIF s.cgpa >= 8 THEN academic_score := 90;
    ELSIF s.cgpa >= 7 THEN academic_score := 75;
    ELSIF s.cgpa >= 6 THEN academic_score := 60;
    ELSE academic_score := 40;
    END IF;
  END IF;
  IF COALESCE(s.active_backlogs, 0) > 0 THEN
    academic_score := GREATEST(0, academic_score - LEAST(30, s.active_backlogs * 10));
  END IF;

  SELECT
    COALESCE(AVG(technical_score), 0) * 10,
    COALESCE(AVG(communication_score), 0) * 10,
    count(*)
  INTO interview_tech, interview_comm, interview_n
  FROM (
    SELECT technical_score, communication_score
    FROM public.placement_interviews
    WHERE upper(trim(roll_number)) = upper(trim(s.roll_number))
    ORDER BY created_at DESC
    LIMIT 10
  ) recent;

  IF interview_n > 0 AND interview_tech > 0 THEN
    technical_score := LEAST(100, interview_tech);
  ELSE
    IF platform_count >= 1 THEN from_platforms := 38; END IF;
    IF platform_count >= 2 THEN from_platforms := 50; END IF;
    IF platform_count >= 3 THEN from_platforms := 62; END IF;
    IF platform_count >= 4 THEN from_platforms := 72; END IF;
    IF platform_count >= 5 THEN from_platforms := 82; END IF;
    IF total_solved > 0 THEN from_solved := LEAST(100, total_solved::numeric / 3.0); END IF;
    IF s.codenow_score IS NOT NULL THEN code_now := GREATEST(0, LEAST(100, s.codenow_score)); END IF;
    IF s.aptitude_score IS NOT NULL THEN aptitude := GREATEST(0, LEAST(100, s.aptitude_score)); END IF;

    signal_n := 0;
    signal_sum := 0;
    primary_sig := 0;
    IF from_platforms > 0 THEN signal_n := signal_n + 1; signal_sum := signal_sum + from_platforms; primary_sig := GREATEST(primary_sig, from_platforms); END IF;
    IF from_solved > 0 THEN signal_n := signal_n + 1; signal_sum := signal_sum + from_solved; primary_sig := GREATEST(primary_sig, from_solved); END IF;
    IF code_now > 0 THEN signal_n := signal_n + 1; signal_sum := signal_sum + code_now; primary_sig := GREATEST(primary_sig, code_now); END IF;
    IF aptitude > 0 THEN signal_n := signal_n + 1; signal_sum := signal_sum + aptitude; primary_sig := GREATEST(primary_sig, aptitude); END IF;

    IF signal_n = 0 THEN
      IF has_linkedin OR has_github THEN technical_score := 28; ELSE technical_score := 18; END IF;
    ELSE
      secondary_avg := signal_sum / signal_n;
      technical_score := LEAST(100, ROUND(primary_sig * 0.65 + secondary_avg * 0.35));
    END IF;
  END IF;

  IF s.communication_score IS NOT NULL THEN
    communication_score := GREATEST(0, LEAST(100, s.communication_score));
  ELSIF interview_n > 0 AND interview_comm > 0 THEN
    communication_score := LEAST(100, interview_comm);
  ELSIF s.verbal_score IS NOT NULL THEN
    communication_score := GREATEST(0, LEAST(100, s.verbal_score));
  ELSIF has_linkedin THEN
    communication_score := 42;
  ELSE
    communication_score := 28;
  END IF;

  -- Weights: profile 22%, resume 20%, technical 20%, academic 15%, techStack 13%, communication 10%
  overall := ROUND(
    profile_score * 0.22
    + resume_score * 0.20
    + technical_score * 0.20
    + academic_score * 0.15
    + tech_score * 0.13
    + communication_score * 0.10
  );
  overall := GREATEST(0, LEAST(100, overall));

  IF overall >= 85 THEN status := 'highly_ready';
  ELSIF overall >= 70 THEN status := 'ready';
  ELSIF overall >= 55 THEN status := 'developing';
  ELSIF overall >= 40 THEN status := 'needs_work';
  ELSE status := 'not_ready';
  END IF;

  risk_points := 0;
  IF NOT has_resume THEN risk_points := risk_points + 2; END IF;
  IF overall < 50 THEN risk_points := risk_points + 2; END IF;
  IF COALESCE(s.active_backlogs, 0) > 0 THEN risk_points := risk_points + 1; END IF;
  IF tech_count = 0 AND NOT has_skills_text THEN risk_points := risk_points + 1; END IF;
  IF platform_count = 0 THEN risk_points := risk_points + 1; END IF;
  IF NOT has_linkedin THEN risk_points := risk_points + 1; END IF;
  IF s.is_placement_eligible IS FALSE THEN risk_points := risk_points + 1; END IF;
  IF risk_points >= 5 THEN risk := 'high';
  ELSIF risk_points >= 2 THEN risk := 'medium';
  ELSE risk := 'low';
  END IF;

  INSERT INTO public.readiness_snapshots (
    student_profile_id,
    overall_score,
    technical_score,
    communication_score,
    resume_score,
    tech_stack_score,
    profile_score,
    academic_score,
    risk_level,
    readiness_status,
    score_breakdown
  ) VALUES (
    p_student_id,
    overall,
    ROUND(technical_score),
    ROUND(communication_score),
    ROUND(resume_score),
    ROUND(tech_score),
    ROUND(profile_score),
    ROUND(academic_score),
    risk,
    status,
    jsonb_build_object(
      'weights', jsonb_build_object(
        'profile', 0.22, 'resume', 0.2, 'technical', 0.2,
        'academic', 0.15, 'techStack', 0.13, 'communication', 0.1
      ),
      'platformCount', platform_count,
      'totalSolved', total_solved,
      'hasActiveResume', has_resume,
      'source', 'auto_refresh'
    )
  );

  UPDATE public.student_profiles
  SET
    readiness_score = overall,
    readiness_status = status,
    risk_level = risk,
    profile_completeness = ROUND(profile_score),
    updated_at = now()
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'ok', true,
    'overallScore', overall,
    'readinessStatus', status,
    'profileCompleteness', ROUND(profile_score),
    'technicalScore', ROUND(technical_score),
    'communicationScore', ROUND(communication_score),
    'resumeScore', ROUND(resume_score),
    'techStackScore', ROUND(tech_score),
    'profileScore', ROUND(profile_score),
    'academicScore', ROUND(academic_score)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_student_readiness(uuid) TO anon, authenticated;

DROP TRIGGER IF EXISTS trg_student_profiles_auto_readiness ON public.student_profiles;
DROP TRIGGER IF EXISTS trg_student_resumes_auto_readiness ON public.student_resumes;
DROP TRIGGER IF EXISTS trg_student_tech_skills_auto_readiness ON public.student_tech_skills;
DROP TRIGGER IF EXISTS trg_student_tech_skills_auto_readiness_del ON public.student_tech_skills;
DROP TRIGGER IF EXISTS trg_student_coding_snapshots_auto_readiness ON public.student_coding_snapshots;

CREATE OR REPLACE FUNCTION public.trg_auto_refresh_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'student_profiles' THEN sid := OLD.id;
    ELSE sid := OLD.student_profile_id;
    END IF;
  ELSE
    IF TG_TABLE_NAME = 'student_profiles' THEN sid := NEW.id;
    ELSE sid := NEW.student_profile_id;
    END IF;
  END IF;
  IF sid IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM public.refresh_student_readiness(sid);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_student_profiles_auto_readiness
AFTER INSERT OR UPDATE OF
  full_name, email, phone, branch, batch, cgpa, linkedin_url, github_url,
  portfolio_url, skills_summary, career_interest, communication_score, codenow_score,
  aptitude_score, verbal_score, active_backlogs, is_placement_eligible,
  platform_handles, projects_summary, certifications_summary, internship_summary,
  graduation_year
ON public.student_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_refresh_readiness();

CREATE TRIGGER trg_student_resumes_auto_readiness
AFTER INSERT OR UPDATE OF review_status, resume_score, ats_friendly, is_active, storage_path
ON public.student_resumes
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_refresh_readiness();

CREATE TRIGGER trg_student_tech_skills_auto_readiness
AFTER INSERT OR UPDATE OR DELETE
ON public.student_tech_skills
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_refresh_readiness();

CREATE TRIGGER trg_student_coding_snapshots_auto_readiness
AFTER INSERT OR UPDATE OF total_solved, linked_count
ON public.student_coding_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_refresh_readiness();

-- Backfill all active students (scores may be stale under old formula)
DO $$
DECLARE
  rec record;
  n int := 0;
BEGIN
  FOR rec IN
    SELECT sp.id
    FROM public.student_profiles sp
    WHERE sp.is_active = true
    ORDER BY sp.updated_at DESC NULLS LAST
    LIMIT 2000
  LOOP
    PERFORM public.refresh_student_readiness(rec.id);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'Refreshed readiness for % students', n;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'readiness backfill skipped: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
