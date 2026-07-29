-- Auto-refresh readiness after public registration / resume upload.
-- Mirrors src/lib/placementReadiness.ts weights. Safe to re-run.

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
  communication_score numeric := 40;
  technical_score numeric := 25;
  interview_tech numeric := 0;
  interview_comm numeric := 0;
  interview_n int := 0;
  filled int := 0;
  overall numeric := 0;
  status text := 'not_ready';
  risk text := 'medium';
  risk_points int := 0;
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
  END IF;

  IF resume_row.id IS NOT NULL THEN
    resume_score := CASE WHEN COALESCE(resume_row.resume_score, 0) > 0 THEN resume_row.resume_score ELSE 45 END;
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
  IF NULLIF(trim(COALESCE(s.batch, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  IF s.cgpa IS NOT NULL THEN filled := filled + 1; END IF;
  IF NULLIF(trim(COALESCE(s.linkedin_url, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  IF NULLIF(trim(COALESCE(s.github_url, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  IF NULLIF(trim(COALESCE(s.skills_summary, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  IF NULLIF(trim(COALESCE(s.career_interest, '')), '') IS NOT NULL THEN filled := filled + 1; END IF;
  profile_score := ROUND((filled::numeric / 10) * 100);

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

  IF s.communication_score IS NOT NULL THEN
    communication_score := GREATEST(0, LEAST(100, s.communication_score));
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
  ELSIF s.codenow_score IS NOT NULL THEN
    technical_score := GREATEST(0, LEAST(100, s.codenow_score));
  ELSIF COALESCE(s.readiness_score, 0) > 0 THEN
    technical_score := LEAST(100, s.readiness_score * 0.6);
  ELSE
    technical_score := 25;
  END IF;

  IF s.communication_score IS NULL AND interview_n > 0 AND interview_comm > 0 THEN
    communication_score := LEAST(100, interview_comm);
  END IF;

  overall := ROUND(
    technical_score * 0.25
    + communication_score * 0.20
    + resume_score * 0.20
    + tech_score * 0.15
    + profile_score * 0.10
    + academic_score * 0.10
  );
  overall := GREATEST(0, LEAST(100, overall));

  IF overall >= 85 THEN status := 'highly_ready';
  ELSIF overall >= 70 THEN status := 'ready';
  ELSIF overall >= 55 THEN status := 'developing';
  ELSIF overall >= 40 THEN status := 'needs_work';
  ELSE status := 'not_ready';
  END IF;

  risk_points := 0;
  IF resume_row.id IS NULL THEN risk_points := risk_points + 2; END IF;
  IF overall < 50 THEN risk_points := risk_points + 2; END IF;
  IF COALESCE(s.active_backlogs, 0) > 0 THEN risk_points := risk_points + 1; END IF;
  IF tech_count = 0 THEN risk_points := risk_points + 1; END IF;
  IF interview_n = 0 THEN risk_points := risk_points + 1; END IF;
  IF s.is_placement_eligible IS FALSE THEN risk_points := risk_points + 2; END IF;
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
        'technical', 0.25, 'communication', 0.2, 'resume', 0.2,
        'techStack', 0.15, 'profile', 0.1, 'academic', 0.1
      ),
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

-- Auto-refresh when profile fields or resumes change (does not re-fire on readiness-only updates)
CREATE OR REPLACE FUNCTION public.trg_auto_refresh_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
BEGIN
  IF TG_TABLE_NAME = 'student_profiles' THEN
    sid := NEW.id;
  ELSE
    sid := NEW.student_profile_id;
  END IF;
  IF sid IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM public.refresh_student_readiness(sid);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_profiles_auto_readiness ON public.student_profiles;
CREATE TRIGGER trg_student_profiles_auto_readiness
AFTER INSERT OR UPDATE OF
  full_name, email, phone, branch, batch, cgpa, linkedin_url, github_url,
  skills_summary, career_interest, communication_score, codenow_score,
  active_backlogs, is_placement_eligible
ON public.student_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_refresh_readiness();

DROP TRIGGER IF EXISTS trg_student_resumes_auto_readiness ON public.student_resumes;
CREATE TRIGGER trg_student_resumes_auto_readiness
AFTER INSERT OR UPDATE OF review_status, resume_score, ats_friendly, is_active, storage_path
ON public.student_resumes
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_refresh_readiness();

-- Soft backfill: refresh students who still show 0 readiness but have profile data
DO $$
DECLARE
  rec record;
  n int := 0;
BEGIN
  FOR rec IN
    SELECT sp.id
    FROM public.student_profiles sp
    WHERE sp.is_active = true
      AND COALESCE(sp.readiness_score, 0) = 0
      AND (
        sp.cgpa IS NOT NULL
        OR NULLIF(trim(COALESCE(sp.email, '')), '') IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.student_resumes r
          WHERE r.student_profile_id = sp.id AND r.is_active = true
        )
      )
    ORDER BY sp.updated_at DESC NULLS LAST
    LIMIT 500
  LOOP
    PERFORM public.refresh_student_readiness(rec.id);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'Refreshed readiness for % students', n;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'readiness backfill skipped: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
