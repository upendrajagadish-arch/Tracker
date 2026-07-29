-- =============================================================================
-- Campaign shared-link hardening (Phases 1–3)
-- Run ONCE in Supabase SQL Editor before sharing campaign links with students.
-- Safe to re-run.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Upload-token columns (short-lived resume capability after register)
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS campaign_resume_upload_token text,
  ADD COLUMN IF NOT EXISTS campaign_resume_upload_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS campaign_resume_upload_campaign_id uuid;

CREATE INDEX IF NOT EXISTS student_profiles_resume_upload_token_idx
  ON public.student_profiles (campaign_resume_upload_token)
  WHERE campaign_resume_upload_token IS NOT NULL;

-- Opaque public link token (optional; UUID links still work)
ALTER TABLE public.student_update_campaigns
  ADD COLUMN IF NOT EXISTS public_link_token text;

UPDATE public.student_update_campaigns
SET public_link_token = encode(extensions.gen_random_bytes(24), 'hex')
WHERE public_link_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS student_update_campaigns_public_link_token_idx
  ON public.student_update_campaigns (public_link_token)
  WHERE public_link_token IS NOT NULL;

-- Simple per-campaign + roll rate limit
CREATE TABLE IF NOT EXISTS public.public_registration_rate_limits (
  bucket text PRIMARY KEY,
  hit_count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_registration_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only SECURITY DEFINER functions touch this table.

CREATE OR REPLACE FUNCTION public._public_registration_rate_ok(p_bucket text, p_limit int, p_window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_hit int;
  row_start timestamptz;
BEGIN
  SELECT hit_count, window_start INTO row_hit, row_start
  FROM public.public_registration_rate_limits
  WHERE bucket = p_bucket
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.public_registration_rate_limits (bucket, hit_count, window_start)
    VALUES (p_bucket, 1, now())
    ON CONFLICT (bucket) DO UPDATE
      SET hit_count = public.public_registration_rate_limits.hit_count + 1;
    RETURN true;
  END IF;

  IF row_start < now() - make_interval(secs => p_window_seconds) THEN
    UPDATE public.public_registration_rate_limits
    SET hit_count = 1, window_start = now()
    WHERE bucket = p_bucket;
    RETURN true;
  END IF;

  IF row_hit >= p_limit THEN
    RETURN false;
  END IF;

  UPDATE public.public_registration_rate_limits
  SET hit_count = hit_count + 1
  WHERE bucket = p_bucket;
  RETURN true;
END;
$$;

-- Resolve campaign by UUID or public_link_token
CREATE OR REPLACE FUNCTION public._resolve_active_campaign(p_campaign_id uuid)
RETURNS public.student_update_campaigns
LANGUAGE plpgsql
STABLE
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
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF c.status IS DISTINCT FROM 'active' THEN
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
    'campaignId', c.id,
    'campaignTitle', c.title,
    'campaignDescription', COALESCE(c.description, ''),
    'expiresAt', c.expires_at,
    'allowlistedFields', COALESCE(c.allowlisted_fields, '[]'::jsonb),
    'publicLinkToken', c.public_link_token
  );
END;
$$;

-- Also allow lookup by opaque token string via overloaded helper used from app if needed
CREATE OR REPLACE FUNCTION public.get_public_campaign_registration_form_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.student_update_campaigns%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 32 THEN
    RETURN NULL;
  END IF;
  SELECT * INTO c
  FROM public.student_update_campaigns
  WHERE public_link_token = trim(p_token);
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF c.status IS DISTINCT FROM 'active' THEN
    RETURN NULL;
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'campaignId', c.id,
    'campaignTitle', c.title,
    'campaignDescription', COALESCE(c.description, ''),
    'expiresAt', c.expires_at,
    'allowlistedFields', COALESCE(c.allowlisted_fields, '[]'::jsonb),
    'publicLinkToken', c.public_link_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_campaign_registration_form(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_campaign_registration_form_by_token(text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- submit_public_campaign_registration (hardened)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_public_campaign_registration(
  p_campaign_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  campaign_status text;
  campaign_expires timestamptz;
  allowed jsonb;
  clean_roll text;
  clean_name text;
  existing_id uuid;
  new_id uuid;
  did_update boolean := false;
  filtered_handles jsonb := '{}'::jsonb;
  raw_handles jsonb;
  raw_year text;
  raw_program text;
  parsed_grad integer;
  parsed_admission integer;
  academic_label text;
  program_label text;
  next_email text;
  next_phone text;
  next_branch text;
  next_batch text;
  next_academic text;
  next_section text;
  next_dob date;
  next_cgpa numeric;
  next_backlogs integer;
  next_linkedin text;
  next_github text;
  next_portfolio text;
  next_skills text;
  next_career text;
  next_projects text;
  next_certs text;
  existing_email text;
  existing_phone text;
  verify_email text;
  verify_phone text;
  upload_tok text;
BEGIN
  IF p_campaign_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This registration link is invalid or has expired');
  END IF;

  SELECT c.status, c.expires_at, COALESCE(c.allowlisted_fields, '[]'::jsonb)
  INTO campaign_status, campaign_expires, allowed
  FROM public.student_update_campaigns c
  WHERE c.id = p_campaign_id;

  IF NOT FOUND OR campaign_status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This registration link is invalid or has expired');
  END IF;

  IF campaign_expires IS NOT NULL AND campaign_expires <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This registration link is invalid or has expired');
  END IF;

  clean_roll := upper(trim(COALESCE(p_payload->>'rollNumber', p_payload->>'roll_number', '')));
  clean_name := trim(COALESCE(p_payload->>'fullName', p_payload->>'full_name', ''));

  IF clean_roll = '' OR clean_name = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Roll number and full name are required');
  END IF;

  IF NOT public._public_registration_rate_ok(
    'campaign:' || p_campaign_id::text || ':' || clean_roll,
    8,
    600
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Too many attempts for this roll number. Please wait a few minutes and try again.');
  END IF;

  -- Ownership verification fields (always read; not gated by allowlist)
  verify_email := lower(trim(COALESCE(p_payload->>'email', '')));
  verify_phone := regexp_replace(trim(COALESCE(p_payload->>'phone', '')), '[^0-9+]', '', 'g');

  raw_handles := COALESCE(p_payload->'platformHandles', p_payload->'platform_handles', '{}'::jsonb);
  SELECT COALESCE(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
  INTO filtered_handles
  FROM jsonb_each(raw_handles) AS entry
  WHERE allowed ? 'platform_handles'
     OR allowed ? ('platform_handles.' || entry.key);

  IF filtered_handles IS NULL THEN
    filtered_handles := '{}'::jsonb;
  END IF;

  raw_year := trim(COALESCE(
    p_payload->>'graduationYear',
    p_payload->>'graduation_year',
    p_payload->>'passOutYear',
    p_payload->>'pass_out_year',
    p_payload->>'academicBatch',
    p_payload->>'academic_batch',
    ''
  ));
  IF raw_year = '' OR raw_year ~* '(ignite|pinnacle|connect)' THEN
    raw_year := trim(COALESCE(p_payload->>'batch', ''));
  END IF;
  IF raw_year ~* '(ignite|pinnacle|connect)' THEN
    raw_year := '';
  END IF;

  IF raw_year ~ '^\d{4}$' THEN
    parsed_grad := raw_year::int;
    parsed_admission := parsed_grad - 4;
    academic_label := parsed_admission::text || '-' || parsed_grad::text;
  ELSIF raw_year ~ '^\d{4}\s*[-–]\s*\d{4}$' THEN
    parsed_admission := substring(raw_year from '^(\d{4})')::int;
    parsed_grad := substring(raw_year from '(\d{4})\s*$')::int;
    academic_label := parsed_admission::text || '-' || parsed_grad::text;
  ELSE
    parsed_grad := NULL;
    parsed_admission := NULL;
    academic_label := '';
  END IF;

  raw_program := trim(COALESCE(
    p_payload->>'section',
    p_payload->>'trainingProgram',
    p_payload->>'training_program',
    ''
  ));
  IF raw_program ~* 'ignite' THEN
    program_label := 'Ignite';
  ELSIF raw_program ~* 'connect' THEN
    program_label := 'Connect';
  ELSIF raw_program ~* 'pinnacle' THEN
    program_label := 'Pinnacle';
  ELSE
    program_label := '';
  END IF;

  next_email := CASE WHEN allowed ? 'email' THEN COALESCE(p_payload->>'email', '') ELSE NULL END;
  next_phone := CASE WHEN allowed ? 'phone' THEN COALESCE(p_payload->>'phone', '') ELSE NULL END;
  next_branch := CASE WHEN allowed ? 'branch' THEN COALESCE(p_payload->>'branch', '') ELSE NULL END;
  next_batch := CASE
    WHEN program_label <> '' THEN program_label
    WHEN parsed_grad IS NOT NULL THEN parsed_grad::text
    WHEN allowed ? 'batch' OR allowed ? 'academic_batch' THEN COALESCE(p_payload->>'batch', '')
    ELSE ''
  END;
  next_academic := CASE
    WHEN academic_label <> '' THEN academic_label
    WHEN parsed_grad IS NOT NULL THEN (parsed_grad - 4)::text || '-' || parsed_grad::text
    WHEN allowed ? 'batch' OR allowed ? 'academic_batch'
      THEN COALESCE(p_payload->>'academicBatch', p_payload->>'academic_batch', p_payload->>'batch', '')
    ELSE ''
  END;
  next_section := COALESCE(program_label, '');
  next_dob := CASE
    WHEN NOT (allowed ? 'date_of_birth')
      OR COALESCE(p_payload->>'dateOfBirth', p_payload->>'date_of_birth', '') = '' THEN NULL
    ELSE COALESCE(p_payload->>'dateOfBirth', p_payload->>'date_of_birth')::date
  END;
  next_cgpa := CASE
    WHEN NOT (allowed ? 'cgpa') OR COALESCE(p_payload->>'cgpa', '') = '' THEN NULL
    ELSE (p_payload->>'cgpa')::numeric
  END;
  next_backlogs := CASE
    WHEN allowed ? 'active_backlogs'
      THEN COALESCE((p_payload->>'activeBacklogs')::int, (p_payload->>'active_backlogs')::int, 0)
    ELSE NULL
  END;
  next_linkedin := CASE WHEN allowed ? 'linkedin_url' THEN COALESCE(p_payload->>'linkedinUrl', p_payload->>'linkedin_url', '') ELSE NULL END;
  next_github := CASE WHEN allowed ? 'github_url' THEN COALESCE(p_payload->>'githubUrl', p_payload->>'github_url', '') ELSE NULL END;
  next_portfolio := CASE WHEN allowed ? 'portfolio_url' THEN COALESCE(p_payload->>'portfolioUrl', p_payload->>'portfolio_url', '') ELSE NULL END;
  next_skills := CASE WHEN allowed ? 'skills_summary' THEN COALESCE(p_payload->>'skillsSummary', p_payload->>'skills_summary', '') ELSE NULL END;
  next_career := CASE WHEN allowed ? 'career_interest' THEN COALESCE(p_payload->>'careerInterest', p_payload->>'career_interest', '') ELSE NULL END;
  next_projects := CASE WHEN allowed ? 'projects_summary' THEN COALESCE(p_payload->>'projectsSummary', p_payload->>'projects_summary', '') ELSE NULL END;
  next_certs := CASE
    WHEN allowed ? 'certifications_summary'
      THEN COALESCE(p_payload->>'certificationsSummary', p_payload->>'certifications_summary', '')
    ELSE NULL
  END;

  SELECT sp.id, sp.email, sp.phone
  INTO existing_id, existing_email, existing_phone
  FROM public.student_profiles sp
  WHERE upper(trim(sp.roll_number)) = clean_roll
  ORDER BY sp.is_active DESC, sp.updated_at DESC NULLS LAST
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    -- Unique roll: resubmit overwrites with newest details (no email/phone ownership gate).
    upload_tok := encode(extensions.gen_random_bytes(24), 'hex');

    UPDATE public.student_profiles sp
    SET
      full_name = clean_name,
      email = CASE
        WHEN verify_email <> '' THEN verify_email
        WHEN next_email IS NOT NULL THEN next_email
        ELSE sp.email
      END,
      phone = CASE
        WHEN next_phone IS NOT NULL THEN next_phone
        WHEN verify_phone <> '' THEN verify_phone
        ELSE sp.phone
      END,
      branch = COALESCE(next_branch, sp.branch),
      batch = CASE WHEN next_batch <> '' THEN next_batch ELSE sp.batch END,
      academic_batch = CASE WHEN next_academic <> '' THEN next_academic ELSE sp.academic_batch END,
      section = CASE WHEN next_section <> '' THEN next_section ELSE sp.section END,
      admission_year = COALESCE(parsed_admission, sp.admission_year),
      graduation_year = COALESCE(parsed_grad, sp.graduation_year),
      date_of_birth = COALESCE(next_dob, sp.date_of_birth),
      cgpa = COALESCE(next_cgpa, sp.cgpa),
      active_backlogs = COALESCE(next_backlogs, sp.active_backlogs),
      linkedin_url = COALESCE(next_linkedin, sp.linkedin_url),
      github_url = COALESCE(next_github, sp.github_url),
      portfolio_url = COALESCE(next_portfolio, sp.portfolio_url),
      skills_summary = COALESCE(next_skills, sp.skills_summary),
      career_interest = COALESCE(next_career, sp.career_interest),
      platform_handles = CASE
        WHEN filtered_handles IS NULL OR filtered_handles = '{}'::jsonb THEN sp.platform_handles
        ELSE filtered_handles
      END,
      projects_summary = COALESCE(next_projects, sp.projects_summary),
      certifications_summary = COALESCE(next_certs, sp.certifications_summary),
      registered_via_campaign_id = p_campaign_id,
      campaign_resume_upload_token = upload_tok,
      campaign_resume_upload_expires_at = now() + interval '45 minutes',
      campaign_resume_upload_campaign_id = p_campaign_id,
      is_active = true,
      updated_at = now()
    WHERE sp.id = existing_id;

    new_id := existing_id;
    did_update := true;
  ELSE
    upload_tok := encode(extensions.gen_random_bytes(24), 'hex');

    BEGIN
      INSERT INTO public.student_profiles (
        roll_number, full_name, email, phone, branch, batch, academic_batch, section,
        admission_year, graduation_year, date_of_birth, cgpa, active_backlogs,
        placement_status, is_active, linkedin_url, github_url, portfolio_url,
        skills_summary, career_interest, platform_handles, projects_summary,
        certifications_summary, registered_via_campaign_id, is_shareable, share_token,
        campaign_resume_upload_token, campaign_resume_upload_expires_at, campaign_resume_upload_campaign_id
      ) VALUES (
        clean_roll, clean_name,
        COALESCE(next_email, NULLIF(verify_email, ''), ''),
        COALESCE(next_phone, ''),
        COALESCE(next_branch, ''),
        next_batch, next_academic, next_section,
        parsed_admission, parsed_grad, next_dob, next_cgpa, COALESCE(next_backlogs, 0),
        'NOT_STARTED', true,
        COALESCE(next_linkedin, ''), COALESCE(next_github, ''), COALESCE(next_portfolio, ''),
        COALESCE(next_skills, ''), COALESCE(next_career, ''), filtered_handles,
        COALESCE(next_projects, ''), COALESCE(next_certs, ''),
        p_campaign_id,
        false,
        NULL,
        upload_tok,
        now() + interval '45 minutes',
        p_campaign_id
      )
      RETURNING id INTO new_id;
    EXCEPTION
      WHEN unique_violation THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error', 'This roll number was just registered. Submit again to update with the newest details.'
        );
    END;
  END IF;

  BEGIN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, description, metadata, actor_role)
    VALUES (
      CASE WHEN did_update THEN 'campaign.register_update' ELSE 'campaign.register' END,
      'student_profile',
      new_id::text,
      CASE WHEN did_update THEN 'Student updated registration via campaign link'
           ELSE 'Student self-registered via campaign link' END,
      jsonb_build_object('campaignId', p_campaign_id, 'rollNumber', clean_roll, 'updated', did_update),
      'public_campaign'
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'studentProfileId', new_id,
    'updated', did_update,
    'resumeUploadToken', upload_tok
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_campaign_registration(uuid, jsonb) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- register_public_campaign_registration_resume (token + campaign match)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.register_public_campaign_registration_resume(uuid, uuid, text, text, text, int);

CREATE OR REPLACE FUNCTION public.register_public_campaign_registration_resume(
  p_campaign_id uuid,
  p_student_profile_id uuid,
  p_file_name text,
  p_storage_path text,
  p_mime_type text,
  p_file_size int,
  p_upload_token text DEFAULT NULL
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
  tok text := NULLIF(trim(COALESCE(p_upload_token, '')), '');
BEGIN
  c := public._resolve_active_campaign(p_campaign_id);
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This registration link is invalid or has expired');
  END IF;

  IF NOT (COALESCE(c.allowlisted_fields, '[]'::jsonb) ? 'resume') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Resume upload is not enabled for this campaign');
  END IF;

  IF p_student_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Student profile is required');
  END IF;

  IF tok IS NULL OR length(tok) < 32 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Resume upload session expired. Submit the registration form again, then upload the resume.');
  END IF;

  SELECT id INTO student_id
  FROM public.student_profiles
  WHERE id = p_student_profile_id
    AND is_active = true
    AND registered_via_campaign_id = c.id
    AND campaign_resume_upload_token = tok
    AND campaign_resume_upload_campaign_id = c.id
    AND campaign_resume_upload_expires_at IS NOT NULL
    AND campaign_resume_upload_expires_at > now()
  LIMIT 1;

  IF student_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Student registration not found for this campaign');
  END IF;

  expected_prefix := 'campaign-reg/' || c.id::text || '/' || student_id::text || '/';
  IF p_storage_path IS NULL OR position(expected_prefix in p_storage_path) <> 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid resume storage path');
  END IF;

  IF lower(COALESCE(p_mime_type, '')) NOT IN (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only PDF, DOC, or DOCX resumes are allowed');
  END IF;

  IF COALESCE(p_file_size, 0) <= 0 OR COALESCE(p_file_size, 0) > 10485760 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Resume file must be between 1 byte and 10 MB');
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

  UPDATE public.student_profiles
  SET
    campaign_resume_upload_token = NULL,
    campaign_resume_upload_expires_at = NULL,
    campaign_resume_upload_campaign_id = NULL,
    updated_at = now()
  WHERE id = student_id;

  BEGIN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, description, metadata, actor_role)
    VALUES (
      'campaign.register_resume',
      'student_profile',
      student_id::text,
      'Student uploaded resume during campaign registration',
      jsonb_build_object('campaignId', c.id, 'fileName', p_file_name, 'storagePath', p_storage_path),
      'public_campaign'
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'studentProfileId', student_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_public_campaign_registration_resume(uuid, uuid, text, text, text, int, text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage policies: no anon SELECT; hardened INSERT
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "campaign registration resume read" ON storage.objects;
DROP POLICY IF EXISTS "campaign registration resume upload" ON storage.objects;

CREATE POLICY "campaign registration resume upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = 'campaign-reg'
    AND lower(COALESCE(metadata->>'mimetype', '')) IN (
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    AND COALESCE((metadata->>'size')::bigint, 0) BETWEEN 1 AND 10485760
    AND EXISTS (
      SELECT 1
      FROM public.student_update_campaigns campaign
      WHERE campaign.id::text = (storage.foldername(name))[2]
        AND campaign.status = 'active'
        AND (campaign.expires_at IS NULL OR campaign.expires_at > now())
        AND COALESCE(campaign.allowlisted_fields, '[]'::jsonb) ? 'resume'
    )
    AND EXISTS (
      SELECT 1
      FROM public.student_profiles student
      WHERE student.id::text = (storage.foldername(name))[3]
        AND student.is_active = true
        AND student.registered_via_campaign_id::text = (storage.foldername(name))[2]
        AND student.campaign_resume_upload_token IS NOT NULL
        AND student.campaign_resume_upload_expires_at IS NOT NULL
        AND student.campaign_resume_upload_expires_at > now()
        AND student.campaign_resume_upload_campaign_id::text = (storage.foldername(name))[2]
    )
  );

-- -----------------------------------------------------------------------------
-- Revoke dangerous roll → token lookup for anon
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.resolve_public_campaign_student_token(uuid,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.resolve_public_campaign_student_token(uuid, text) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.resolve_public_campaign_student_token(uuid, text) FROM anon;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Drive registration: snapshot only — do not overwrite student_profiles
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_public_drive_registration(
  p_token text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link public.placement_drive_links%ROWTYPE;
  event_row public.placement_events%ROWTYPE;
  payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  clean_roll text;
  clean_email text;
  clean_mobile text;
  clean_name text;
  resume_link text;
  student_id uuid;
  registration_id uuid;
  tenth numeric;
  twelfth numeric;
  v_cgpa numeric;
  backlogs integer;
BEGIN
  link := public._resolve_active_drive_link(p_token);
  IF link.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This registration link is invalid or has expired.');
  END IF;

  SELECT * INTO event_row FROM public.placement_events WHERE id = link.placement_event_id;

  clean_roll := upper(trim(COALESCE(payload->>'rollNumber', payload->>'roll_number', '')));
  clean_name := trim(COALESCE(payload->>'fullName', payload->>'full_name', ''));
  clean_email := lower(trim(COALESCE(payload->>'email', '')));
  clean_mobile := trim(COALESCE(payload->>'mobile', payload->>'phone', ''));
  resume_link := trim(COALESCE(payload->>'resumeUrl', payload->>'resume_url', ''));

  IF clean_roll = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Roll number is required.');
  END IF;
  IF clean_name = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Full name is required.');
  END IF;
  IF clean_email = '' OR clean_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A valid email is required.');
  END IF;
  IF clean_mobile = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Mobile number is required.');
  END IF;
  IF resume_link = '' OR resume_link !~* '^https?://' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A valid resume URL (http/https) is required.');
  END IF;

  IF NOT public._public_registration_rate_ok('drive:' || link.id::text || ':' || clean_roll, 5, 600) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
  END IF;

  tenth := NULLIF(trim(COALESCE(payload->>'tenthPercentage', payload->>'tenth_percentage', '')), '')::numeric;
  twelfth := NULLIF(trim(COALESCE(payload->>'twelfthPercentage', payload->>'twelfth_percentage', '')), '')::numeric;
  v_cgpa := NULLIF(trim(COALESCE(payload->>'btechCgpa', payload->>'btech_cgpa', payload->>'cgpa', '')), '')::numeric;
  backlogs := COALESCE(NULLIF(trim(COALESCE(payload->>'activeBacklogs', payload->>'active_backlogs', '')), '')::int, 0);

  IF tenth IS NULL OR twelfth IS NULL OR v_cgpa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '10th marks, 12th marks, and B.Tech CGPA are required.');
  END IF;
  IF tenth < 0 OR tenth > 100 OR twelfth < 0 OR twelfth > 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', '10th and 12th marks must be between 0 and 100.');
  END IF;
  IF v_cgpa < 0 OR v_cgpa > 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'B.Tech CGPA must be between 0 and 10.');
  END IF;
  IF backlogs < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Active backlogs cannot be negative.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.placement_drive_registrations r
    WHERE r.placement_event_id = link.placement_event_id
      AND upper(trim(r.roll_number)) = clean_roll
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'You have already registered for this company drive with this roll number.'
    );
  END IF;

  -- Link existing profile if present; never overwrite core profile fields from public drive form
  SELECT id INTO student_id
  FROM public.student_profiles
  WHERE upper(trim(roll_number)) = clean_roll
  LIMIT 1;

  INSERT INTO public.placement_drive_registrations (
    placement_event_id,
    company_id,
    drive_link_id,
    student_profile_id,
    full_name,
    roll_number,
    email,
    mobile,
    tenth_percentage,
    twelfth_percentage,
    btech_cgpa,
    active_backlogs,
    resume_url
  ) VALUES (
    link.placement_event_id,
    link.company_id,
    link.id,
    student_id,
    clean_name,
    clean_roll,
    clean_email,
    clean_mobile,
    tenth,
    twelfth,
    v_cgpa,
    backlogs,
    resume_link
  )
  RETURNING id INTO registration_id;

  RETURN jsonb_build_object('ok', true, 'registrationId', registration_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_drive_registration(text, jsonb) TO anon, authenticated;

-- Hide placementEventId from public drive form
CREATE OR REPLACE FUNCTION public.get_public_drive_registration_form(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link public.placement_drive_links%ROWTYPE;
  event_row public.placement_events%ROWTYPE;
  company_name text;
BEGIN
  link := public._resolve_active_drive_link(p_token);
  IF link.id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT * INTO event_row FROM public.placement_events WHERE id = link.placement_event_id;
  SELECT name INTO company_name FROM public.companies WHERE id = link.company_id;
  RETURN jsonb_build_object(
    'companyName', COALESCE(company_name, 'Company drive'),
    'driveTitle', COALESCE(event_row.title, link.label, 'Company drive'),
    'startsAt', event_row.starts_at,
    'venue', COALESCE(event_row.venue, ''),
    'mode', COALESCE(event_row.mode, ''),
    'registrationClosesAt', link.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_drive_registration_form(text) TO anon, authenticated;

-- Strip shareToken from public leaderboard (re-apply year-wise body without shareToken)
-- Only replaces the jsonb_build_object projection if function exists with 4 args.
DO $$
BEGIN
  -- Best-effort: if year-wise leaderboard exists, leave function intact and document
  -- that staff should re-run scripts/apply-year-wise-leaderboard.sql after removing shareToken.
  NULL;
END $$;

NOTIFY pgrst, 'reload schema';

-- Strip staff-only fields from existing campaign allowlists
UPDATE public.student_update_campaigns
SET allowlisted_fields =
  (COALESCE(allowlisted_fields, '[]'::jsonb) - 'placement_status' - 'is_placement_eligible');

-- Also re-run scripts/apply-year-wise-leaderboard.sql after this file
-- (removes shareToken from the public leaderboard payload).
