-- Student self-service update campaigns (token-based, no login)

CREATE TABLE IF NOT EXISTS public.student_update_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'closed')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  allowlisted_fields jsonb NOT NULL DEFAULT '[
    "phone","address","projects_summary","certifications_summary",
    "internship_summary","skills_summary","portfolio_url","linkedin_url",
    "github_url","career_interest","platform_handles"
  ]'::jsonb,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_update_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.student_update_campaigns(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  opened_at timestamptz,
  submitted_at timestamptz,
  last_activity_at timestamptz,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, student_profile_id),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS student_update_tokens_campaign_idx
  ON public.student_update_tokens (campaign_id);
CREATE INDEX IF NOT EXISTS student_update_tokens_student_idx
  ON public.student_update_tokens (student_profile_id);
CREATE INDEX IF NOT EXISTS student_update_tokens_active_idx
  ON public.student_update_tokens (is_active, expires_at)
  WHERE is_active = true AND revoked_at IS NULL;

CREATE TRIGGER student_update_campaigns_set_updated_at
  BEFORE UPDATE ON public.student_update_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER student_update_tokens_set_updated_at
  BEFORE UPDATE ON public.student_update_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.student_update_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_update_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff view update campaigns"
  ON public.student_update_campaigns FOR SELECT
  USING (public.current_app_role() IN ('admin', 'tpo', 'faculty'));

CREATE POLICY "tpo admin manage update campaigns"
  ON public.student_update_campaigns FOR ALL
  USING (public.current_app_role() IN ('admin', 'tpo'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo'));

CREATE POLICY "staff view update tokens"
  ON public.student_update_tokens FOR SELECT
  USING (public.current_app_role() IN ('admin', 'tpo', 'faculty'));

CREATE POLICY "tpo admin manage update tokens"
  ON public.student_update_tokens FOR ALL
  USING (public.current_app_role() IN ('admin', 'tpo'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo'));

-- Validate campaign token row
CREATE OR REPLACE FUNCTION public._resolve_update_token(p_token text)
RETURNS public.student_update_tokens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.student_update_tokens%ROWTYPE;
  c public.student_update_campaigns%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 48 OR p_token !~ '^[a-f0-9]{48,64}$' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO t
  FROM public.student_update_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF t.is_active IS NOT TRUE OR t.revoked_at IS NOT NULL OR t.expires_at <= now() THEN
    RETURN NULL;
  END IF;

  SELECT * INTO c FROM public.student_update_campaigns WHERE id = t.campaign_id;
  IF NOT FOUND OR c.status <> 'active' THEN
    RETURN NULL;
  END IF;

  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN
    RETURN NULL;
  END IF;

  RETURN t;
END;
$$;

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
    'locked', jsonb_build_object(
      'fullName', s.full_name,
      'rollNumber', s.roll_number,
      'email', s.email,
      'branch', s.branch,
      'section', COALESCE(s.section, ''),
      'academicBatch', COALESCE(NULLIF(s.academic_batch, ''), s.batch),
      'admissionYear', s.admission_year,
      'graduationYear', s.graduation_year,
      'placementStatus', s.placement_status,
      'readinessScore', s.readiness_score,
      'readinessStatus', s.readiness_status,
      'communicationScore', s.communication_score,
      'aptitudeScore', s.aptitude_score,
      'verbalScore', s.verbal_score,
      'codenowScore', s.codenow_score
    ),
    'editable', jsonb_build_object(
      'phone', s.phone,
      'address', COALESCE(s.address, ''),
      'projectsSummary', COALESCE(s.projects_summary, ''),
      'certificationsSummary', COALESCE(s.certifications_summary, ''),
      'internshipSummary', COALESCE(s.internship_summary, ''),
      'skillsSummary', COALESCE(s.skills_summary, ''),
      'portfolioUrl', COALESCE(s.portfolio_url, ''),
      'linkedinUrl', COALESCE(s.linkedin_url, ''),
      'githubUrl', COALESCE(s.github_url, ''),
      'careerInterest', COALESCE(s.career_interest, ''),
      'platformHandles', COALESCE(s.platform_handles, '{}'::jsonb)
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
  patch jsonb := '{}'::jsonb;
  key text;
  field_map jsonb := '{
    "phone":"phone",
    "address":"address",
    "projects_summary":"projects_summary",
    "projectsSummary":"projects_summary",
    "certifications_summary":"certifications_summary",
    "certificationsSummary":"certifications_summary",
    "internship_summary":"internship_summary",
    "internshipSummary":"internship_summary",
    "skills_summary":"skills_summary",
    "skillsSummary":"skills_summary",
    "portfolio_url":"portfolio_url",
    "portfolioUrl":"portfolio_url",
    "linkedin_url":"linkedin_url",
    "linkedinUrl":"linkedin_url",
    "github_url":"github_url",
    "githubUrl":"github_url",
    "career_interest":"career_interest",
    "careerInterest":"career_interest",
    "platform_handles":"platform_handles",
    "platformHandles":"platform_handles"
  }'::jsonb;
  col text;
  val jsonb;
  updated_cols text[] := ARRAY[]::text[];
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

  -- Simple rate limit: reject if submitted within last 8 seconds
  IF t.last_activity_at IS NOT NULL
     AND t.submitted_at IS NOT NULL
     AND t.last_activity_at > now() - interval '8 seconds' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please wait a moment before submitting again');
  END IF;

  allowed := COALESCE(c.allowlisted_fields, '[]'::jsonb);

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
    IF col = 'platform_handles' THEN
      patch := patch || jsonb_build_object(col, COALESCE(val, '{}'::jsonb));
    ELSE
      patch := patch || jsonb_build_object(col, COALESCE(val #>> '{}', ''));
    END IF;
    updated_cols := array_append(updated_cols, col);
  END LOOP;

  IF jsonb_typeof(patch) = 'object' AND patch <> '{}'::jsonb THEN
    UPDATE public.student_profiles sp SET
      phone = COALESCE(patch->>'phone', sp.phone),
      address = COALESCE(patch->>'address', sp.address),
      projects_summary = COALESCE(patch->>'projects_summary', sp.projects_summary),
      certifications_summary = COALESCE(patch->>'certifications_summary', sp.certifications_summary),
      internship_summary = COALESCE(patch->>'internship_summary', sp.internship_summary),
      skills_summary = COALESCE(patch->>'skills_summary', sp.skills_summary),
      portfolio_url = COALESCE(patch->>'portfolio_url', sp.portfolio_url),
      linkedin_url = COALESCE(patch->>'linkedin_url', sp.linkedin_url),
      github_url = COALESCE(patch->>'github_url', sp.github_url),
      career_interest = COALESCE(patch->>'career_interest', sp.career_interest),
      platform_handles = CASE
        WHEN patch ? 'platform_handles' THEN COALESCE(patch->'platform_handles', '{}'::jsonb)
        ELSE sp.platform_handles
      END,
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

CREATE OR REPLACE FUNCTION public.register_public_campaign_resume(
  p_token text,
  p_file_name text,
  p_storage_path text,
  p_mime_type text,
  p_file_size int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.student_update_tokens%ROWTYPE;
  expected_prefix text;
BEGIN
  t := public._resolve_update_token(p_token);
  IF t.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired update link');
  END IF;

  expected_prefix := 'campaign/' || p_token || '/';
  IF p_storage_path IS NULL OR position(expected_prefix in p_storage_path) <> 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid resume storage path');
  END IF;

  UPDATE public.student_resumes
  SET is_active = false
  WHERE student_profile_id = t.student_profile_id AND is_active = true;

  INSERT INTO public.student_resumes (
    student_profile_id, file_name, storage_path, mime_type, file_size, is_active, review_status
  ) VALUES (
    t.student_profile_id,
    COALESCE(NULLIF(p_file_name, ''), 'resume.pdf'),
    p_storage_path,
    COALESCE(NULLIF(p_mime_type, ''), 'application/pdf'),
    COALESCE(p_file_size, 0),
    true,
    'pending'
  );

  UPDATE public.student_update_tokens
  SET last_activity_at = now(),
      submitted_at = COALESCE(submitted_at, now())
  WHERE id = t.id;

  INSERT INTO public.audit_logs (action, entity_type, entity_id, description, metadata, actor_role)
  VALUES (
    'campaign.resume_upload',
    'student_update_token',
    t.id::text,
    'Student uploaded resume via campaign link',
    jsonb_build_object('campaignId', t.campaign_id, 'studentProfileId', t.student_profile_id, 'fileName', p_file_name),
    'public_token'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_update_form(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_student_update(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_public_campaign_resume(text, text, text, text, int) TO anon, authenticated;

-- Allow anon resume upload only under campaign/{token}/... for valid tokens
CREATE POLICY "campaign token resume upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = 'campaign'
    AND EXISTS (
      SELECT 1
      FROM public.student_update_tokens t
      JOIN public.student_update_campaigns c ON c.id = t.campaign_id
      WHERE t.token = (storage.foldername(name))[2]
        AND t.is_active = true
        AND t.revoked_at IS NULL
        AND t.expires_at > now()
        AND c.status = 'active'
    )
  );

CREATE POLICY "campaign token resume read own upload"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = 'campaign'
    AND EXISTS (
      SELECT 1
      FROM public.student_update_tokens t
      WHERE t.token = (storage.foldername(name))[2]
        AND t.is_active = true
        AND t.revoked_at IS NULL
        AND t.expires_at > now()
    )
  );
