-- Enforce campaign-selected registration fields and per-platform handle choices.

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
  allowed jsonb;
  raw_handles jsonb;
  filtered_handles jsonb;
BEGIN
  c := public._resolve_active_campaign(p_campaign_id);
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This registration link is invalid or has expired');
  END IF;

  allowed := COALESCE(c.allowlisted_fields, '[]'::jsonb);
  clean_roll := upper(trim(COALESCE(payload->>'rollNumber', payload->>'roll_number', '')));
  clean_email := CASE
    WHEN allowed ? 'email' THEN lower(trim(COALESCE(payload->>'email', '')))
    ELSE ''
  END;

  IF clean_roll = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Roll number is required');
  END IF;

  IF COALESCE(NULLIF(trim(payload->>'fullName'), ''), NULLIF(trim(payload->>'full_name'), '')) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Full name is required');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE upper(trim(sp.roll_number)) = clean_roll
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'A student with this roll number is already registered. Please use a different roll number or contact placement staff.'
    );
  END IF;

  IF clean_email <> '' AND EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE lower(trim(sp.email)) = clean_email AND sp.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'A student with this email is already registered. Please use a different email or contact placement staff.'
    );
  END IF;

  raw_handles := COALESCE(payload->'platformHandles', payload->'platform_handles', '{}'::jsonb);
  SELECT COALESCE(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
  INTO filtered_handles
  FROM jsonb_each(raw_handles) AS entry
  WHERE allowed ? 'platform_handles'
     OR allowed ? ('platform_handles.' || entry.key);

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
      certifications_summary,
      registered_via_campaign_id,
      is_active
    ) VALUES (
      trim(COALESCE(payload->>'rollNumber', payload->>'roll_number')),
      trim(COALESCE(payload->>'fullName', payload->>'full_name')),
      CASE WHEN allowed ? 'email' THEN COALESCE(payload->>'email', '') ELSE '' END,
      CASE WHEN allowed ? 'phone' THEN COALESCE(payload->>'phone', '') ELSE '' END,
      CASE WHEN allowed ? 'branch' THEN COALESCE(payload->>'branch', '') ELSE '' END,
      CASE
        WHEN allowed ? 'batch' OR allowed ? 'academic_batch'
          THEN COALESCE(payload->>'batch', payload->>'academicBatch', payload->>'academic_batch', '')
        ELSE ''
      END,
      CASE
        WHEN allowed ? 'batch' OR allowed ? 'academic_batch'
          THEN COALESCE(payload->>'academicBatch', payload->>'academic_batch', payload->>'batch', '')
        ELSE ''
      END,
      CASE
        WHEN NOT (allowed ? 'date_of_birth')
          OR COALESCE(payload->>'dateOfBirth', payload->>'date_of_birth', '') = '' THEN NULL
        ELSE COALESCE(payload->>'dateOfBirth', payload->>'date_of_birth')::date
      END,
      CASE
        WHEN NOT (allowed ? 'cgpa') OR COALESCE(payload->>'cgpa', '') = '' THEN NULL
        ELSE (payload->>'cgpa')::numeric
      END,
      CASE
        WHEN allowed ? 'active_backlogs'
          THEN COALESCE((payload->>'activeBacklogs')::int, (payload->>'active_backlogs')::int, 0)
        ELSE 0
      END,
      'NOT_STARTED',
      true,
      CASE WHEN allowed ? 'linkedin_url' THEN COALESCE(payload->>'linkedinUrl', payload->>'linkedin_url', '') ELSE '' END,
      CASE WHEN allowed ? 'github_url' THEN COALESCE(payload->>'githubUrl', payload->>'github_url', '') ELSE '' END,
      CASE WHEN allowed ? 'portfolio_url' THEN COALESCE(payload->>'portfolioUrl', payload->>'portfolio_url', '') ELSE '' END,
      CASE WHEN allowed ? 'skills_summary' THEN COALESCE(payload->>'skillsSummary', payload->>'skills_summary', '') ELSE '' END,
      CASE WHEN allowed ? 'career_interest' THEN COALESCE(payload->>'careerInterest', payload->>'career_interest', '') ELSE '' END,
      filtered_handles,
      CASE WHEN allowed ? 'projects_summary' THEN COALESCE(payload->>'projectsSummary', payload->>'projects_summary', '') ELSE '' END,
      CASE
        WHEN allowed ? 'certifications_summary'
          THEN COALESCE(payload->>'certificationsSummary', payload->>'certifications_summary', '')
        ELSE ''
      END,
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
  p_student_profile_id uuid,
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
  expected_prefix text;
BEGIN
  c := public._resolve_active_campaign(p_campaign_id);
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This registration link is invalid or has expired');
  END IF;

  -- The umbrella platform_handles entry identifies legacy campaigns that exposed every field.
  IF NOT (
    COALESCE(c.allowlisted_fields, '[]'::jsonb) ? 'resume'
    OR COALESCE(c.allowlisted_fields, '[]'::jsonb) ? 'platform_handles'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Resume upload is not enabled for this campaign');
  END IF;

  IF p_student_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Student profile is required');
  END IF;

  SELECT id INTO student_id
  FROM public.student_profiles
  WHERE id = p_student_profile_id
    AND registered_via_campaign_id = c.id
    AND is_active = true
  LIMIT 1;

  IF student_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Student registration not found for this campaign');
  END IF;

  expected_prefix := 'campaign-reg/' || c.id::text || '/' || student_id::text || '/';
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

  INSERT INTO public.audit_logs (action, entity_type, entity_id, description, metadata, actor_role)
  VALUES (
    'campaign.register_resume',
    'student_profile',
    student_id::text,
    'Student uploaded resume during campaign registration',
    jsonb_build_object('campaignId', c.id, 'fileName', p_file_name, 'storagePath', p_storage_path),
    'public_campaign'
  );

  RETURN jsonb_build_object('ok', true, 'studentProfileId', student_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_campaign_registration(uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_public_campaign_registration_resume(uuid, uuid, text, text, text, int) TO anon, authenticated;

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
        AND (
          COALESCE(c.allowlisted_fields, '[]'::jsonb) ? 'resume'
          OR COALESCE(c.allowlisted_fields, '[]'::jsonb) ? 'platform_handles'
        )
    )
  );
