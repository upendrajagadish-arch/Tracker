-- Safe campaign registration update: pass-out year + Ignite/Pinnacle/Connect.
-- IMPORTANT: Run this in Supabase project idkvhuibqponkhseigox
-- (same project as VITE_SUPABASE_URL in .env.local).
-- Dashboard URL should look like:
--   https://supabase.com/dashboard/project/idkvhuibqponkhseigox/sql/new

DO $$
BEGIN
  IF to_regclass('public.student_profiles') IS NULL THEN
    RAISE EXCEPTION
      'Wrong Supabase project: public.student_profiles was not found. Open project idkvhuibqponkhseigox (the CodeTrace app DB) and run this script there. Do NOT run it on a blank/new project.';
  END IF;
  IF to_regclass('public.student_update_campaigns') IS NULL THEN
    RAISE EXCEPTION
      'public.student_update_campaigns is missing on this project. You are likely on the wrong database. Use project idkvhuibqponkhseigox.';
  END IF;
END $$;

BEGIN;

CREATE TABLE IF NOT EXISTS public.student_update_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'closed')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  allowlisted_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS registered_via_campaign_id uuid;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT '';

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS academic_batch text;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS admission_year integer;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS graduation_year integer;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS certifications_summary text NOT NULL DEFAULT '';

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS is_shareable boolean NOT NULL DEFAULT false;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS share_token text;

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
  new_id uuid;
  filtered_handles jsonb := '{}'::jsonb;
  raw_year text;
  raw_program text;
  parsed_grad integer;
  parsed_admission integer;
  academic_label text;
  program_label text;
  share_tok text;
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

  IF EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE upper(trim(sp.roll_number)) = clean_roll AND sp.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'A student with this roll number is already registered. Please use a different roll number or contact placement staff.'
    );
  END IF;

  filtered_handles := COALESCE(p_payload->'platformHandles', p_payload->'platform_handles', '{}'::jsonb);

  -- Pass-out year (prefer explicit year fields; ignore Ignite/Pinnacle/Connect labels)
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

  -- Training program batch name
  raw_program := trim(COALESCE(
    p_payload->>'section',
    p_payload->>'trainingProgram',
    p_payload->>'training_program',
    p_payload->>'batch',
    ''
  ));
  IF raw_program ~* 'ignite' THEN
    program_label := 'Ignite';
  ELSIF raw_program ~* 'connect' THEN
    program_label := 'Connect';
  ELSIF raw_program ~* 'pinnacle' THEN
    program_label := 'Pinnacle';
  ELSIF raw_program ~ '^\d{4}' THEN
    program_label := '';
  ELSE
    program_label := raw_program;
  END IF;

  share_tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  BEGIN
    INSERT INTO public.student_profiles (
      roll_number,
      full_name,
      email,
      phone,
      branch,
      batch,
      academic_batch,
      section,
      admission_year,
      graduation_year,
      date_of_birth,
      cgpa,
      active_backlogs,
      placement_status,
      is_active,
      linkedin_url,
      github_url,
      portfolio_url,
      skills_summary,
      career_interest,
      platform_handles,
      projects_summary,
      certifications_summary,
      registered_via_campaign_id,
      is_shareable,
      share_token
    ) VALUES (
      clean_roll,
      clean_name,
      CASE WHEN allowed ? 'email' THEN COALESCE(p_payload->>'email', '') ELSE '' END,
      CASE WHEN allowed ? 'phone' THEN COALESCE(p_payload->>'phone', '') ELSE '' END,
      CASE WHEN allowed ? 'branch' THEN COALESCE(p_payload->>'branch', '') ELSE '' END,
      CASE
        WHEN program_label <> '' THEN program_label
        WHEN parsed_grad IS NOT NULL THEN parsed_grad::text
        ELSE COALESCE(p_payload->>'batch', '')
      END,
      CASE
        WHEN academic_label <> '' THEN academic_label
        WHEN parsed_grad IS NOT NULL THEN (parsed_grad - 4)::text || '-' || parsed_grad::text
        ELSE COALESCE(p_payload->>'academicBatch', p_payload->>'academic_batch', '')
      END,
      COALESCE(program_label, ''),
      parsed_admission,
      parsed_grad,
      CASE
        WHEN NOT (allowed ? 'date_of_birth')
          OR COALESCE(p_payload->>'dateOfBirth', p_payload->>'date_of_birth', '') = '' THEN NULL
        ELSE COALESCE(p_payload->>'dateOfBirth', p_payload->>'date_of_birth')::date
      END,
      CASE
        WHEN NOT (allowed ? 'cgpa') OR COALESCE(p_payload->>'cgpa', '') = '' THEN NULL
        ELSE (p_payload->>'cgpa')::numeric
      END,
      CASE
        WHEN allowed ? 'active_backlogs'
          THEN COALESCE((p_payload->>'activeBacklogs')::int, (p_payload->>'active_backlogs')::int, 0)
        ELSE 0
      END,
      'NOT_STARTED',
      true,
      CASE WHEN allowed ? 'linkedin_url' THEN COALESCE(p_payload->>'linkedinUrl', p_payload->>'linkedin_url', '') ELSE '' END,
      CASE WHEN allowed ? 'github_url' THEN COALESCE(p_payload->>'githubUrl', p_payload->>'github_url', '') ELSE '' END,
      CASE WHEN allowed ? 'portfolio_url' THEN COALESCE(p_payload->>'portfolioUrl', p_payload->>'portfolio_url', '') ELSE '' END,
      CASE WHEN allowed ? 'skills_summary' THEN COALESCE(p_payload->>'skillsSummary', p_payload->>'skills_summary', '') ELSE '' END,
      CASE WHEN allowed ? 'career_interest' THEN COALESCE(p_payload->>'careerInterest', p_payload->>'career_interest', '') ELSE '' END,
      filtered_handles,
      CASE WHEN allowed ? 'projects_summary' THEN COALESCE(p_payload->>'projectsSummary', p_payload->>'projects_summary', '') ELSE '' END,
      CASE
        WHEN allowed ? 'certifications_summary'
          THEN COALESCE(p_payload->>'certificationsSummary', p_payload->>'certifications_summary', '')
        ELSE ''
      END,
      p_campaign_id,
      true,
      share_tok
    )
    RETURNING id INTO new_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'A student with this roll number is already registered. Please use a different roll number or contact placement staff.'
      );
  END;

  BEGIN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, description, metadata, actor_role)
    VALUES (
      'campaign.register',
      'student_profile',
      new_id::text,
      'Student self-registered via campaign link',
      jsonb_build_object(
        'campaignId', p_campaign_id,
        'rollNumber', clean_roll,
        'graduationYear', parsed_grad,
        'trainingProgram', program_label
      ),
      'public_campaign'
    );
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'studentProfileId', new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_campaign_registration(uuid, jsonb) TO anon, authenticated;

-- Ensure active registration campaigns collect year + training program.
UPDATE public.student_update_campaigns
SET allowlisted_fields = (
  SELECT jsonb_agg(DISTINCT value)
  FROM jsonb_array_elements(
    COALESCE(allowlisted_fields, '[]'::jsonb)
    || '["batch","section","academic_batch"]'::jsonb
  ) AS value
)
WHERE status = 'active';

COMMIT;
