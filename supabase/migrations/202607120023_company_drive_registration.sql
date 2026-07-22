-- Company drive registration: public token links and per-drive application snapshots.

CREATE TABLE IF NOT EXISTS public.placement_drive_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_event_id uuid NOT NULL REFERENCES public.placement_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.placement_drive_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_event_id uuid NOT NULL REFERENCES public.placement_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  drive_link_id uuid REFERENCES public.placement_drive_links(id) ON DELETE SET NULL,
  student_profile_id uuid REFERENCES public.student_profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  roll_number text NOT NULL,
  email text NOT NULL DEFAULT '',
  mobile text NOT NULL DEFAULT '',
  tenth_percentage numeric(5, 2),
  twelfth_percentage numeric(5, 2),
  btech_cgpa numeric(4, 2),
  active_backlogs integer NOT NULL DEFAULT 0,
  resume_url text NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT placement_drive_reg_tenth_range
    CHECK (tenth_percentage IS NULL OR (tenth_percentage >= 0 AND tenth_percentage <= 100)),
  CONSTRAINT placement_drive_reg_twelfth_range
    CHECK (twelfth_percentage IS NULL OR (twelfth_percentage >= 0 AND twelfth_percentage <= 100)),
  CONSTRAINT placement_drive_reg_cgpa_range
    CHECK (btech_cgpa IS NULL OR (btech_cgpa >= 0 AND btech_cgpa <= 10)),
  CONSTRAINT placement_drive_reg_backlogs_nonneg
    CHECK (active_backlogs >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS placement_drive_registrations_event_roll_idx
  ON public.placement_drive_registrations (placement_event_id, upper(trim(roll_number)));

CREATE INDEX IF NOT EXISTS placement_drive_links_event_idx
  ON public.placement_drive_links (placement_event_id);
CREATE INDEX IF NOT EXISTS placement_drive_registrations_event_idx
  ON public.placement_drive_registrations (placement_event_id, submitted_at DESC);

DROP TRIGGER IF EXISTS placement_drive_links_set_updated_at ON public.placement_drive_links;
CREATE TRIGGER placement_drive_links_set_updated_at
  BEFORE UPDATE ON public.placement_drive_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.placement_drive_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_drive_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff view placement drive links" ON public.placement_drive_links;
CREATE POLICY "staff view placement drive links"
  ON public.placement_drive_links FOR SELECT
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'tpo', 'faculty', 'interviewer'));

DROP POLICY IF EXISTS "admin tpo manage placement drive links" ON public.placement_drive_links;
CREATE POLICY "admin tpo manage placement drive links"
  ON public.placement_drive_links FOR ALL
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'tpo'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo'));

DROP POLICY IF EXISTS "staff view placement drive registrations" ON public.placement_drive_registrations;
CREATE POLICY "staff view placement drive registrations"
  ON public.placement_drive_registrations FOR SELECT
  TO authenticated
  USING (public.current_app_role() IN ('admin', 'tpo', 'faculty', 'interviewer'));

CREATE OR REPLACE FUNCTION public._resolve_active_drive_link(p_token text)
RETURNS public.placement_drive_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link public.placement_drive_links%ROWTYPE;
  event_row public.placement_events%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 32 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO link
  FROM public.placement_drive_links
  WHERE token = trim(p_token)
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF link.expires_at IS NOT NULL AND link.expires_at <= now() THEN
    RETURN NULL;
  END IF;

  SELECT * INTO event_row
  FROM public.placement_events
  WHERE id = link.placement_event_id;

  IF NOT FOUND OR event_row.status = 'cancelled' THEN
    RETURN NULL;
  END IF;

  RETURN link;
END;
$$;

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
    'driveTitle', event_row.title,
    'startsAt', event_row.starts_at,
    'venue', event_row.venue,
    'mode', event_row.mode,
    'registrationClosesAt', link.expires_at,
    'placementEventId', event_row.id
  );
END;
$$;

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

  SELECT id INTO student_id
  FROM public.student_profiles
  WHERE upper(trim(roll_number)) = clean_roll
  LIMIT 1;

  IF student_id IS NULL THEN
    INSERT INTO public.student_profiles (
      roll_number, full_name, email, phone, cgpa, active_backlogs, is_active, placement_status
    ) VALUES (
      clean_roll, clean_name, clean_email, clean_mobile, v_cgpa, backlogs, true, 'NOT_STARTED'
    )
    RETURNING id INTO student_id;
  ELSE
    UPDATE public.student_profiles
    SET
      full_name = clean_name,
      email = CASE WHEN clean_email <> '' THEN clean_email ELSE email END,
      phone = CASE WHEN clean_mobile <> '' THEN clean_mobile ELSE phone END,
      cgpa = v_cgpa,
      active_backlogs = backlogs,
      updated_at = now()
    WHERE id = student_id;
  END IF;

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

  INSERT INTO public.audit_logs (action, entity_type, entity_id, description, metadata, actor_role)
  VALUES (
    'drive.register',
    'placement_drive_registration',
    registration_id::text,
    'Student registered for company drive',
    jsonb_build_object(
      'placementEventId', link.placement_event_id,
      'companyId', link.company_id,
      'rollNumber', clean_roll
    ),
    'public_drive'
  );

  RETURN jsonb_build_object('ok', true, 'registrationId', registration_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'You have already registered for this company drive with this roll number.'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_company_drive_with_registration(
  p_title text,
  p_company_id uuid,
  p_starts_at timestamptz,
  p_registration_closes_at timestamptz DEFAULT NULL,
  p_venue text DEFAULT '',
  p_mode text DEFAULT 'on_campus',
  p_audience_batches text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  created_event public.placement_events%ROWTYPE;
  company_name text;
  drive_token text;
  link_id uuid;
  link_label text;
BEGIN
  IF public.current_app_role() NOT IN ('admin', 'tpo') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Company is required for drive registration';
  END IF;
  IF trim(COALESCE(p_title, '')) = '' OR p_starts_at IS NULL THEN
    RAISE EXCEPTION 'Drive title and start time are required';
  END IF;

  SELECT name INTO company_name FROM public.companies WHERE id = p_company_id;
  IF company_name IS NULL THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  INSERT INTO public.placement_events (
    company_id, title, event_type, mode, starts_at, venue,
    status, audience_batches, created_by
  )
  VALUES (
    p_company_id,
    trim(p_title),
    'drive',
    COALESCE(NULLIF(p_mode, ''), 'on_campus'),
    p_starts_at,
    COALESCE(p_venue, ''),
    'scheduled',
    COALESCE(p_audience_batches, '{}'),
    auth.uid()
  )
  RETURNING * INTO created_event;

  drive_token := encode(gen_random_bytes(24), 'hex');
  link_label := company_name || ' — Drive registration';

  INSERT INTO public.placement_drive_links (
    placement_event_id,
    company_id,
    token,
    label,
    expires_at,
    created_by
  )
  VALUES (
    created_event.id,
    p_company_id,
    drive_token,
    link_label,
    p_registration_closes_at,
    auth.uid()
  )
  RETURNING id INTO link_id;

  RETURN jsonb_build_object(
    'event', to_jsonb(created_event),
    'driveLinkId', link_id,
    'token', drive_token,
    'companyName', company_name,
    'label', link_label
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_drive_registration_form(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_drive_registration(text, jsonb) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.schedule_company_drive_with_registration(text, uuid, timestamptz, timestamptz, text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.schedule_company_drive_with_registration(text, uuid, timestamptz, timestamptz, text, text, text[]) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'placement_drive_registrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.placement_drive_registrations;
  END IF;
END $$;
