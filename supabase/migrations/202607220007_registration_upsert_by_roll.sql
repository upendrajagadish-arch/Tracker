-- Allow students to resubmit the same campaign registration link.
-- Roll number stays unique; newest form details overwrite the existing profile.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
  raw_year text;
  raw_program text;
  parsed_grad integer;
  parsed_admission integer;
  academic_label text;
  program_label text;
  share_tok text;
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

  filtered_handles := COALESCE(p_payload->'platformHandles', p_payload->'platform_handles', '{}'::jsonb);

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

  next_email := CASE WHEN allowed ? 'email' THEN COALESCE(p_payload->>'email', '') ELSE NULL END;
  next_phone := CASE WHEN allowed ? 'phone' THEN COALESCE(p_payload->>'phone', '') ELSE NULL END;
  next_branch := CASE WHEN allowed ? 'branch' THEN COALESCE(p_payload->>'branch', '') ELSE NULL END;
  next_batch := CASE
    WHEN program_label <> '' THEN program_label
    WHEN parsed_grad IS NOT NULL THEN parsed_grad::text
    ELSE COALESCE(p_payload->>'batch', '')
  END;
  next_academic := CASE
    WHEN academic_label <> '' THEN academic_label
    WHEN parsed_grad IS NOT NULL THEN (parsed_grad - 4)::text || '-' || parsed_grad::text
    ELSE COALESCE(p_payload->>'academicBatch', p_payload->>'academic_batch', '')
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

  -- Prefer active profile for this roll; otherwise reactivate the latest match.
  SELECT sp.id
  INTO existing_id
  FROM public.student_profiles sp
  WHERE upper(trim(sp.roll_number)) = clean_roll
  ORDER BY sp.is_active DESC, sp.updated_at DESC NULLS LAST
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.student_profiles sp
    SET
      full_name = clean_name,
      email = COALESCE(next_email, sp.email),
      phone = COALESCE(next_phone, sp.phone),
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
      registered_via_campaign_id = COALESCE(sp.registered_via_campaign_id, p_campaign_id),
      is_active = true,
      updated_at = now()
    WHERE sp.id = existing_id;

    new_id := existing_id;
    did_update := true;
  ELSE
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
        COALESCE(next_email, ''),
        COALESCE(next_phone, ''),
        COALESCE(next_branch, ''),
        next_batch,
        next_academic,
        next_section,
        parsed_admission,
        parsed_grad,
        next_dob,
        next_cgpa,
        COALESCE(next_backlogs, 0),
        'NOT_STARTED',
        true,
        COALESCE(next_linkedin, ''),
        COALESCE(next_github, ''),
        COALESCE(next_portfolio, ''),
        COALESCE(next_skills, ''),
        COALESCE(next_career, ''),
        filtered_handles,
        COALESCE(next_projects, ''),
        COALESCE(next_certs, ''),
        p_campaign_id,
        true,
        share_tok
      )
      RETURNING id INTO new_id;
    EXCEPTION
      WHEN unique_violation THEN
        -- Race: another request inserted the same roll — update that row instead.
        SELECT sp.id INTO existing_id
        FROM public.student_profiles sp
        WHERE upper(trim(sp.roll_number)) = clean_roll
        ORDER BY sp.is_active DESC, sp.updated_at DESC NULLS LAST
        LIMIT 1;

        IF existing_id IS NULL THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Could not save registration. Please try again.');
        END IF;

        UPDATE public.student_profiles sp
        SET
          full_name = clean_name,
          email = COALESCE(next_email, sp.email),
          phone = COALESCE(next_phone, sp.phone),
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
          is_active = true,
          updated_at = now()
        WHERE sp.id = existing_id;

        new_id := existing_id;
        did_update := true;
    END;
  END IF;

  BEGIN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, description, metadata, actor_role)
    VALUES (
      CASE WHEN did_update THEN 'campaign.register_update' ELSE 'campaign.register' END,
      'student_profile',
      new_id::text,
      CASE
        WHEN did_update THEN 'Student updated registration details via campaign link'
        ELSE 'Student self-registered via campaign link'
      END,
      jsonb_build_object(
        'campaignId', p_campaign_id,
        'rollNumber', clean_roll,
        'graduationYear', parsed_grad,
        'trainingProgram', program_label,
        'updated', did_update
      ),
      'public_campaign'
    );
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'studentProfileId', new_id,
    'updated', did_update
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_campaign_registration(uuid, jsonb) TO anon, authenticated;
