-- Expand student update campaigns so public links use the same fields as staff edit-student.

ALTER TABLE public.student_update_campaigns
  ALTER COLUMN allowlisted_fields SET DEFAULT '[
    "roll_number","full_name","email","phone","branch","batch","academic_batch",
    "date_of_birth","cgpa","active_backlogs","placement_status","is_placement_eligible",
    "linkedin_url","github_url","portfolio_url","skills_summary","career_interest",
    "platform_handles","projects_summary"
  ]'::jsonb;

UPDATE public.student_update_campaigns
SET allowlisted_fields = '[
  "roll_number","full_name","email","phone","branch","batch","academic_batch",
  "date_of_birth","cgpa","active_backlogs","placement_status","is_placement_eligible",
  "linkedin_url","github_url","portfolio_url","skills_summary","career_interest",
  "platform_handles","projects_summary"
]'::jsonb;

CREATE OR REPLACE FUNCTION public.get_public_student_update_form(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.student_update_tokens%ROWTYPE;
  c public.student_update_campaigns%ROWTYPE;
  s public.student_profiles%ROWTYPE;
  resume_name text;
BEGIN
  t := public._resolve_update_token(p_token);
  IF t.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO c FROM public.student_update_campaigns WHERE id = t.campaign_id;
  SELECT * INTO s FROM public.student_profiles WHERE id = t.student_profile_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF t.opened_at IS NULL THEN
    UPDATE public.student_update_tokens
    SET opened_at = now(), last_activity_at = now()
    WHERE id = t.id;
  ELSE
    UPDATE public.student_update_tokens
    SET last_activity_at = now()
    WHERE id = t.id;
  END IF;

  SELECT file_name INTO resume_name
  FROM public.student_resumes
  WHERE student_profile_id = s.id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'campaignTitle', c.title,
    'campaignDescription', c.description,
    'expiresAt', COALESCE(t.expires_at, c.expires_at),
    'allowlistedFields', c.allowlisted_fields,
    'submittedAt', t.submitted_at,
    'editable', jsonb_build_object(
      'rollNumber', s.roll_number,
      'fullName', s.full_name,
      'email', COALESCE(s.email, ''),
      'phone', COALESCE(s.phone, ''),
      'branch', COALESCE(s.branch, ''),
      'batch', COALESCE(NULLIF(s.academic_batch, ''), s.batch, ''),
      'academicBatch', COALESCE(NULLIF(s.academic_batch, ''), s.batch, ''),
      'dateOfBirth', s.date_of_birth,
      'cgpa', s.cgpa,
      'activeBacklogs', COALESCE(s.active_backlogs, 0),
      'placementStatus', COALESCE(s.placement_status, 'NOT_STARTED'),
      'isPlacementEligible', COALESCE(s.is_placement_eligible, true),
      'linkedinUrl', COALESCE(s.linkedin_url, ''),
      'githubUrl', COALESCE(s.github_url, ''),
      'portfolioUrl', COALESCE(s.portfolio_url, ''),
      'skillsSummary', COALESCE(s.skills_summary, ''),
      'careerInterest', COALESCE(s.career_interest, ''),
      'platformHandles', COALESCE(s.platform_handles, '{}'::jsonb),
      'projectsSummary', COALESCE(s.projects_summary, '')
    ),
    'resumeFileName', resume_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_student_update(p_token text, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.student_update_tokens%ROWTYPE;
  c public.student_update_campaigns%ROWTYPE;
  s public.student_profiles%ROWTYPE;
  allowed jsonb;
  field_map jsonb := '{
    "roll_number":"roll_number",
    "rollNumber":"roll_number",
    "full_name":"full_name",
    "fullName":"full_name",
    "email":"email",
    "phone":"phone",
    "branch":"branch",
    "batch":"batch",
    "academic_batch":"academic_batch",
    "academicBatch":"academic_batch",
    "date_of_birth":"date_of_birth",
    "dateOfBirth":"date_of_birth",
    "cgpa":"cgpa",
    "active_backlogs":"active_backlogs",
    "activeBacklogs":"active_backlogs",
    "placement_status":"placement_status",
    "placementStatus":"placement_status",
    "is_placement_eligible":"is_placement_eligible",
    "isPlacementEligible":"is_placement_eligible",
    "linkedin_url":"linkedin_url",
    "linkedinUrl":"linkedin_url",
    "github_url":"github_url",
    "githubUrl":"github_url",
    "portfolio_url":"portfolio_url",
    "portfolioUrl":"portfolio_url",
    "skills_summary":"skills_summary",
    "skillsSummary":"skills_summary",
    "career_interest":"career_interest",
    "careerInterest":"career_interest",
    "platform_handles":"platform_handles",
    "platformHandles":"platform_handles",
    "projects_summary":"projects_summary",
    "projectsSummary":"projects_summary",
    "address":"address",
    "certifications_summary":"certifications_summary",
    "certificationsSummary":"certifications_summary",
    "internship_summary":"internship_summary",
    "internshipSummary":"internship_summary"
  }'::jsonb;
  key text;
  col text;
  val jsonb;
  updated_cols text[] := ARRAY[]::text[];
  next_roll text;
  next_full_name text;
  next_email text;
  next_phone text;
  next_branch text;
  next_batch text;
  next_academic_batch text;
  next_date_of_birth date;
  next_cgpa numeric;
  next_active_backlogs int;
  next_placement_status text;
  next_is_placement_eligible boolean;
  next_linkedin text;
  next_github text;
  next_portfolio text;
  next_skills text;
  next_career text;
  next_projects text;
  next_platform_handles jsonb;
  next_address text;
  next_certifications text;
  next_internship text;
BEGIN
  t := public._resolve_update_token(p_token);
  IF t.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired update link');
  END IF;

  SELECT * INTO c FROM public.student_update_campaigns WHERE id = t.campaign_id;
  SELECT * INTO s FROM public.student_profiles WHERE id = t.student_profile_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Student profile not found');
  END IF;

  IF t.last_activity_at IS NOT NULL
     AND t.submitted_at IS NOT NULL
     AND t.last_activity_at > now() - interval '8 seconds' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please wait a moment before submitting again');
  END IF;

  allowed := COALESCE(c.allowlisted_fields, '[]'::jsonb);

  next_roll := s.roll_number;
  next_full_name := s.full_name;
  next_email := s.email;
  next_phone := s.phone;
  next_branch := s.branch;
  next_batch := s.batch;
  next_academic_batch := s.academic_batch;
  next_date_of_birth := s.date_of_birth;
  next_cgpa := s.cgpa;
  next_active_backlogs := COALESCE(s.active_backlogs, 0);
  next_placement_status := s.placement_status;
  next_is_placement_eligible := COALESCE(s.is_placement_eligible, true);
  next_linkedin := s.linkedin_url;
  next_github := s.github_url;
  next_portfolio := s.portfolio_url;
  next_skills := s.skills_summary;
  next_career := s.career_interest;
  next_projects := s.projects_summary;
  next_platform_handles := COALESCE(s.platform_handles, '{}'::jsonb);
  next_address := s.address;
  next_certifications := s.certifications_summary;
  next_internship := s.internship_summary;

  FOR key IN SELECT jsonb_object_keys(COALESCE(p_payload, '{}'::jsonb))
  LOOP
    col := field_map ->> key;
    IF col IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT (allowed ? col OR allowed ? key) THEN
      CONTINUE;
    END IF;
    val := p_payload -> key;
    updated_cols := array_append(updated_cols, col);

    IF col = 'roll_number' THEN
      next_roll := COALESCE(NULLIF(val #>> '{}', ''), next_roll);
    ELSIF col = 'full_name' THEN
      next_full_name := COALESCE(NULLIF(val #>> '{}', ''), next_full_name);
    ELSIF col = 'email' THEN
      next_email := COALESCE(val #>> '{}', '');
    ELSIF col = 'phone' THEN
      next_phone := COALESCE(val #>> '{}', '');
    ELSIF col = 'branch' THEN
      next_branch := COALESCE(val #>> '{}', '');
    ELSIF col = 'batch' THEN
      next_batch := COALESCE(val #>> '{}', '');
      IF next_academic_batch IS NULL OR next_academic_batch = '' THEN
        next_academic_batch := next_batch;
      END IF;
    ELSIF col = 'academic_batch' THEN
      next_academic_batch := COALESCE(val #>> '{}', '');
      next_batch := COALESCE(NULLIF(next_academic_batch, ''), next_batch);
    ELSIF col = 'date_of_birth' THEN
      IF jsonb_typeof(val) = 'null' OR COALESCE(val #>> '{}', '') = '' THEN
        next_date_of_birth := NULL;
      ELSE
        next_date_of_birth := (val #>> '{}')::date;
      END IF;
    ELSIF col = 'cgpa' THEN
      IF jsonb_typeof(val) = 'null' OR COALESCE(val #>> '{}', '') = '' THEN
        next_cgpa := NULL;
      ELSE
        next_cgpa := (val #>> '{}')::numeric;
      END IF;
    ELSIF col = 'active_backlogs' THEN
      next_active_backlogs := COALESCE((val #>> '{}')::int, 0);
    ELSIF col = 'placement_status' THEN
      next_placement_status := COALESCE(NULLIF(val #>> '{}', ''), next_placement_status);
    ELSIF col = 'is_placement_eligible' THEN
      next_is_placement_eligible := COALESCE((val #>> '{}')::boolean, true);
    ELSIF col = 'linkedin_url' THEN
      next_linkedin := COALESCE(val #>> '{}', '');
    ELSIF col = 'github_url' THEN
      next_github := COALESCE(val #>> '{}', '');
    ELSIF col = 'portfolio_url' THEN
      next_portfolio := COALESCE(val #>> '{}', '');
    ELSIF col = 'skills_summary' THEN
      next_skills := COALESCE(val #>> '{}', '');
    ELSIF col = 'career_interest' THEN
      next_career := COALESCE(val #>> '{}', '');
    ELSIF col = 'projects_summary' THEN
      next_projects := COALESCE(val #>> '{}', '');
    ELSIF col = 'platform_handles' THEN
      next_platform_handles := COALESCE(val, '{}'::jsonb);
    ELSIF col = 'address' THEN
      next_address := COALESCE(val #>> '{}', '');
    ELSIF col = 'certifications_summary' THEN
      next_certifications := COALESCE(val #>> '{}', '');
    ELSIF col = 'internship_summary' THEN
      next_internship := COALESCE(val #>> '{}', '');
    END IF;
  END LOOP;

  IF array_length(updated_cols, 1) IS NOT NULL THEN
    UPDATE public.student_profiles sp SET
      roll_number = next_roll,
      full_name = next_full_name,
      email = next_email,
      phone = next_phone,
      branch = next_branch,
      batch = next_batch,
      academic_batch = next_academic_batch,
      date_of_birth = next_date_of_birth,
      cgpa = next_cgpa,
      active_backlogs = next_active_backlogs,
      placement_status = next_placement_status,
      is_placement_eligible = next_is_placement_eligible,
      linkedin_url = next_linkedin,
      github_url = next_github,
      portfolio_url = next_portfolio,
      skills_summary = next_skills,
      career_interest = next_career,
      projects_summary = next_projects,
      platform_handles = next_platform_handles,
      address = next_address,
      certifications_summary = next_certifications,
      internship_summary = next_internship,
      updated_at = now()
    WHERE sp.id = s.id;
  END IF;

  UPDATE public.student_update_tokens
  SET submitted_at = COALESCE(submitted_at, now()),
      last_activity_at = now()
  WHERE id = t.id;

  INSERT INTO public.audit_logs (action, entity_type, entity_id, description, metadata, actor_role)
  VALUES (
    'campaign.submit',
    'student_update_token',
    t.id::text,
    'Student submitted profile update via campaign link',
    jsonb_build_object(
      'campaignId', t.campaign_id,
      'studentProfileId', t.student_profile_id,
      'fields', updated_cols
    ),
    'public_token'
  );

  RETURN jsonb_build_object('ok', true, 'updatedFields', updated_cols);
END;
$$;
