-- Campaign self-registration: students add themselves via one shared link (no pre-existing data).

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS registered_via_campaign_id uuid
    REFERENCES public.student_update_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS student_profiles_registered_campaign_idx
  ON public.student_profiles (registered_via_campaign_id)
  WHERE registered_via_campaign_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public._resolve_active_campaign(p_campaign_id uuid)
RETURNS public.student_update_campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.student_update_campaigns%ROWTYPE;
BEGIN
  IF p_campaign_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO c
  FROM public.student_update_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND OR c.status <> 'active' THEN
    RETURN NULL;
  END IF;

  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN
    RETURN NULL;
  END IF;

  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_campaign_registration_form(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.student_update_campaigns%ROWTYPE;
BEGIN
  c := public._resolve_active_campaign(p_campaign_id);
  IF c.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'campaignTitle', c.title,
    'campaignDescription', c.description,
    'expiresAt', c.expires_at,
    'allowlistedFields', c.allowlisted_fields
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_campaign_registration(
  p_campaign_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.student_update_campaigns%ROWTYPE;
  clean_roll text;
  clean_email text;
  new_id uuid;
  payload jsonb := COALESCE(p_payload, '{}'::jsonb);
BEGIN
  c := public._resolve_active_campaign(p_campaign_id);
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This registration link is invalid or has expired');
  END IF;

  clean_roll := upper(trim(COALESCE(payload->>'rollNumber', payload->>'roll_number', '')));
  clean_email := lower(trim(COALESCE(payload->>'email', '')));

  IF clean_roll = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Roll number is required');
  END IF;

  IF COALESCE(NULLIF(trim(payload->>'fullName'), ''), NULLIF(trim(payload->>'full_name'), '')) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Full name is required');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.student_profiles sp
    WHERE upper(trim(sp.roll_number)) = clean_roll
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'A student with this roll number is already registered. Please use a different roll number or contact placement staff.'
    );
  END IF;

  IF clean_email <> '' AND EXISTS (
    SELECT 1
    FROM public.student_profiles sp
    WHERE lower(trim(sp.email)) = clean_email
      AND sp.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'A student with this email is already registered. Please use a different email or contact placement staff.'
    );
  END IF;

  BEGIN
    INSERT INTO public.student_profiles (
      roll_number,
      full_name,
      email,
      phone,
      branch,
      batch,
      academic_batch,
      date_of_birth,
      cgpa,
      active_backlogs,
      placement_status,
      is_placement_eligible,
      linkedin_url,
      github_url,
      portfolio_url,
      skills_summary,
      career_interest,
      platform_handles,
      projects_summary,
      registered_via_campaign_id,
      is_active
    ) VALUES (
      trim(COALESCE(payload->>'rollNumber', payload->>'roll_number')),
      trim(COALESCE(payload->>'fullName', payload->>'full_name')),
      COALESCE(payload->>'email', ''),
      COALESCE(payload->>'phone', ''),
      COALESCE(payload->>'branch', ''),
      COALESCE(payload->>'batch', payload->>'academicBatch', payload->>'academic_batch', ''),
      COALESCE(payload->>'academicBatch', payload->>'academic_batch', payload->>'batch', ''),
      CASE
        WHEN COALESCE(payload->>'dateOfBirth', payload->>'date_of_birth', '') = '' THEN NULL
        ELSE (COALESCE(payload->>'dateOfBirth', payload->>'date_of_birth'))::date
      END,
      CASE
        WHEN payload->>'cgpa' IS NULL OR payload->>'cgpa' = '' THEN NULL
        ELSE (payload->>'cgpa')::numeric
      END,
      COALESCE((payload->>'activeBacklogs')::int, (payload->>'active_backlogs')::int, 0),
      'NOT_STARTED',
      COALESCE((payload->>'isPlacementEligible')::boolean, (payload->>'is_placement_eligible')::boolean, true),
      COALESCE(payload->>'linkedinUrl', payload->>'linkedin_url', ''),
      COALESCE(payload->>'githubUrl', payload->>'github_url', ''),
      COALESCE(payload->>'portfolioUrl', payload->>'portfolio_url', ''),
      COALESCE(payload->>'skillsSummary', payload->>'skills_summary', ''),
      COALESCE(payload->>'careerInterest', payload->>'career_interest', ''),
      COALESCE(payload->'platformHandles', payload->'platform_handles', '{}'::jsonb),
      COALESCE(payload->>'projectsSummary', payload->>'projects_summary', ''),
      c.id,
      true
    )
    RETURNING id INTO new_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'A student with this roll number is already registered. Please use a different roll number or contact placement staff.'
      );
  END;

  INSERT INTO public.audit_logs (action, entity_type, entity_id, description, metadata, actor_role)
  VALUES (
    'campaign.register',
    'student_profile',
    new_id::text,
    'Student self-registered via campaign link',
    jsonb_build_object('campaignId', c.id, 'rollNumber', clean_roll),
    'public_campaign'
  );

  RETURN jsonb_build_object('ok', true, 'studentProfileId', new_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.register_public_campaign_registration_resume(
  p_campaign_id uuid,
  p_roll_number text,
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
  c public.student_update_campaigns%ROWTYPE;
  student_id uuid;
  clean_roll text := upper(trim(COALESCE(p_roll_number, '')));
  expected_prefix text;
BEGIN
  c := public._resolve_active_campaign(p_campaign_id);
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This registration link is invalid or has expired');
  END IF;

  IF clean_roll = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Roll number is required');
  END IF;

  SELECT id INTO student_id
  FROM public.student_profiles
  WHERE registered_via_campaign_id = c.id
    AND upper(trim(roll_number)) = clean_roll
    AND is_active = true
  LIMIT 1;

  IF student_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Student registration not found for this campaign');
  END IF;

  expected_prefix := 'campaign-reg/' || c.id::text || '/' || clean_roll || '/';
  IF p_storage_path IS NULL OR position(expected_prefix in p_storage_path) <> 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid resume storage path');
  END IF;

  UPDATE public.student_resumes
  SET is_active = false
  WHERE student_profile_id = student_id AND is_active = true;

  INSERT INTO public.student_resumes (
    student_profile_id, file_name, storage_path, mime_type, file_size, is_active, review_status
  ) VALUES (
    student_id,
    COALESCE(NULLIF(p_file_name, ''), 'resume.pdf'),
    p_storage_path,
    COALESCE(NULLIF(p_mime_type, ''), 'application/pdf'),
    COALESCE(p_file_size, 0),
    true,
    'pending'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_campaign_registration_form(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_campaign_registration(uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_public_campaign_registration_resume(uuid, text, text, text, text, int) TO anon, authenticated;

DROP POLICY IF EXISTS "campaign registration resume upload" ON storage.objects;
CREATE POLICY "campaign registration resume upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = 'campaign-reg'
    AND EXISTS (
      SELECT 1
      FROM public.student_update_campaigns c
      WHERE c.id::text = (storage.foldername(name))[2]
        AND c.status = 'active'
        AND (c.expires_at IS NULL OR c.expires_at > now())
    )
  );

DROP POLICY IF EXISTS "campaign registration resume read" ON storage.objects;
CREATE POLICY "campaign registration resume read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = 'campaign-reg'
    AND EXISTS (
      SELECT 1
      FROM public.student_update_campaigns c
      WHERE c.id::text = (storage.foldername(name))[2]
        AND c.status = 'active'
        AND (c.expires_at IS NULL OR c.expires_at > now())
    )
  );
