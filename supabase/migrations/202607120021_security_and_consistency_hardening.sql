-- Security and consistency hardening discovered during the full application audit.

-- TPOs may manage operational data, but only administrators may assign roles.
DROP POLICY IF EXISTS "admin tpo manage placement profiles" ON public.placement_user_profiles;
CREATE POLICY "admin manage placement profiles"
  ON public.placement_user_profiles FOR ALL
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

-- Self-service changes are performed by allowlisted SECURITY DEFINER RPCs.
-- Direct row updates exposed placement/readiness/eligibility fields.
DROP POLICY IF EXISTS "students update own profile" ON public.student_profiles;

WITH ranked_resumes AS (
  SELECT id, row_number() OVER (
    PARTITION BY student_profile_id ORDER BY created_at DESC, id DESC
  ) AS row_number
  FROM public.student_resumes
  WHERE is_active = true
)
UPDATE public.student_resumes resume
SET is_active = false
FROM ranked_resumes ranked
WHERE resume.id = ranked.id AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS student_resumes_one_active_per_student_idx
  ON public.student_resumes(student_profile_id)
  WHERE is_active = true;

-- Keep SQL permissions aligned with staff workflows.
CREATE OR REPLACE FUNCTION public.has_placement_permission(perm text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r placement_role;
BEGIN
  r := public.current_app_role();
  IF r = 'admin' THEN RETURN true; END IF;
  CASE perm
    WHEN 'students:view' THEN RETURN r IN ('tpo', 'faculty', 'interviewer');
    WHEN 'students:update' THEN RETURN r = 'tpo';
    WHEN 'students:export' THEN RETURN r = 'tpo';
    WHEN 'reports:view' THEN RETURN r IN ('tpo', 'faculty');
    WHEN 'reports:export' THEN RETURN r = 'tpo';
    WHEN 'companies:manage' THEN RETURN r = 'tpo';
    WHEN 'matching:run' THEN RETURN r = 'tpo';
    ELSE RETURN false;
  END CASE;
END;
$$;

-- Faculty tech-stack controls are intentional and now match database RLS.
DROP POLICY IF EXISTS "tpo admin manage student tech skills" ON public.student_tech_skills;
CREATE POLICY "authorized staff manage student tech skills"
  ON public.student_tech_skills FOR ALL
  USING (public.current_app_role() IN ('admin', 'tpo', 'faculty'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo', 'faculty'));

DROP POLICY IF EXISTS "tpo admin manage role interests" ON public.student_role_interests;
CREATE POLICY "authorized staff manage role interests"
  ON public.student_role_interests FOR ALL
  USING (public.current_app_role() IN ('admin', 'tpo', 'faculty'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo', 'faculty'));

-- Do not expose secret update tokens through an anonymous roll-number lookup.
DO $$
BEGIN
  IF to_regprocedure('public.resolve_public_campaign_student_token(uuid,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.resolve_public_campaign_student_token(uuid, text) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.resolve_public_campaign_student_token(uuid, text) FROM anon;
  END IF;
END $$;

-- Campaign registration resumes are private. Authenticated staff use existing
-- staff storage policies or application-generated signed URLs.
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
    )
    AND EXISTS (
      SELECT 1
      FROM public.student_profiles student
      WHERE student.id::text = (storage.foldername(name))[3]
        AND student.is_active = true
    )
  );

-- Per-user read state for role notifications.
CREATE TABLE IF NOT EXISTS public.placement_notification_reads (
  notification_id uuid NOT NULL REFERENCES public.placement_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS placement_notification_reads_user_idx
  ON public.placement_notification_reads(user_id, read_at DESC);

ALTER TABLE public.placement_notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own notification receipts" ON public.placement_notification_reads;
CREATE POLICY "users read own notification receipts"
  ON public.placement_notification_reads FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users create own notification receipts" ON public.placement_notification_reads;
CREATE POLICY "users create own notification receipts"
  ON public.placement_notification_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users update own notification receipts" ON public.placement_notification_reads;
CREATE POLICY "users update own notification receipts"
  ON public.placement_notification_reads FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "staff update own notifications" ON public.placement_notifications;
DROP POLICY IF EXISTS "admin tpo update notifications" ON public.placement_notifications;
CREATE POLICY "admin tpo update notifications"
  ON public.placement_notifications FOR UPDATE
  USING (public.current_app_role() IN ('admin', 'tpo'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo'));

-- Audit actors are derived server-side; clients cannot forge identity or role.
DROP POLICY IF EXISTS "staff insert audit logs" ON public.audit_logs;

CREATE OR REPLACE FUNCTION public.log_placement_audit(
  p_action text,
  p_entity_type text DEFAULT '',
  p_entity_id text DEFAULT '',
  p_description text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_placement_permission('students:view') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.audit_logs (
    actor_user_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  )
  VALUES (
    auth.uid(),
    public.current_app_role()::text,
    left(COALESCE(p_action, ''), 200),
    left(COALESCE(p_entity_type, ''), 100),
    left(COALESCE(p_entity_id, ''), 200),
    left(COALESCE(p_description, ''), 1000),
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_placement_audit(text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_placement_audit(text, text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.schedule_placement_drive(
  p_title text,
  p_company_id uuid,
  p_starts_at timestamptz,
  p_venue text DEFAULT '',
  p_mode text DEFAULT 'on_campus',
  p_audience_batches text[] DEFAULT '{}',
  p_registration_url text DEFAULT NULL,
  p_registration_label text DEFAULT NULL
)
RETURNS public.placement_events
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  created_event public.placement_events%ROWTYPE;
BEGIN
  IF public.current_app_role() NOT IN ('admin', 'tpo') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF trim(COALESCE(p_title, '')) = '' OR p_starts_at IS NULL THEN
    RAISE EXCEPTION 'Drive title and start time are required';
  END IF;
  IF p_registration_url IS NOT NULL AND (
    p_company_id IS NULL OR p_registration_url !~* '^https?://'
  ) THEN
    RAISE EXCEPTION 'A valid HTTP(S) registration URL and company are required';
  END IF;

  INSERT INTO public.placement_events (
    company_id, title, event_type, mode, starts_at, venue,
    status, audience_batches, created_by
  )
  VALUES (
    p_company_id, trim(p_title), 'drive', p_mode, p_starts_at,
    COALESCE(p_venue, ''), 'scheduled', COALESCE(p_audience_batches, '{}'), auth.uid()
  )
  RETURNING * INTO created_event;

  IF p_registration_url IS NOT NULL THEN
    INSERT INTO public.company_share_links (
      company_id, label, url, audience_batches, created_by
    )
    VALUES (
      p_company_id,
      COALESCE(NULLIF(trim(p_registration_label), ''), trim(p_title) || ' — Student registration'),
      p_registration_url,
      COALESCE(p_audience_batches, '{}'),
      auth.uid()
    );
  END IF;

  RETURN created_event;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_placement_drive(text, uuid, timestamptz, text, text, text[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.schedule_placement_drive(text, uuid, timestamptz, text, text, text[], text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_resume_book_students(
  p_token text,
  p_page int DEFAULT 1,
  p_limit int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
  lim int;
  off int;
  total int;
  rows jsonb;
  settings jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 48 THEN RETURN NULL; END IF;
  SELECT * INTO b FROM public.resume_book_snapshots
  WHERE share_token = p_token AND is_shareable = true AND status = 'generated';
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF b.expires_at IS NOT NULL AND b.expires_at < now() THEN
    RETURN jsonb_build_object('expired', true);
  END IF;
  settings := b.share_settings;
  lim := least(greatest(coalesce(p_limit, 10), 1), 50);
  off := greatest((coalesce(p_page, 1) - 1) * lim, 0);
  SELECT count(*) INTO total
  FROM public.resume_book_student_snapshots
  WHERE resume_book_id = b.id;
  SELECT coalesce(jsonb_agg(
    CASE
      WHEN (settings->>'allowExternalLinks')::boolean = false THEN
        (s.snapshot - 'linkedinUrl' - 'githubUrl' - 'portfolioUrl' - 'email' - 'phone'
          - 'resumeDownloadUrl' - 'filePath' - 'resumeId' - 'resumeStoragePath')
      ELSE
        (s.snapshot - 'email' - 'phone' - 'resumeDownloadUrl' - 'filePath'
          - 'resumeId' - 'resumeStoragePath')
    END
    ORDER BY s.order_index
  ), '[]'::jsonb) INTO rows
  FROM (
    SELECT * FROM public.resume_book_student_snapshots
    WHERE resume_book_id = b.id
    ORDER BY order_index
    OFFSET off LIMIT lim
  ) s;
  RETURN jsonb_build_object(
    'students', rows,
    'pagination', jsonb_build_object(
      'page', coalesce(p_page, 1),
      'limit', lim,
      'total', total,
      'pages', CASE WHEN total = 0 THEN 0 ELSE ceil(total::numeric / lim)::int END
    )
  );
END;
$$;

-- Public leaderboard is read-only and includes only students who explicitly
-- opted in and already have a public share token.
CREATE OR REPLACE FUNCTION public.get_public_leaderboard(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_search text := NULLIF(trim(COALESCE(p_search, '')), '');
  v_total integer;
  v_rows jsonb;
BEGIN
  WITH scored AS (
    SELECT
      s.*,
      COALESCE(snap.total_solved, 0) AS total_solved,
      COALESCE(snap.linked_count, 0) AS linked_count,
      GREATEST(0, LEAST(1000, ROUND((
        COALESCE(s.communication_score, 0) * 0.25
        + COALESCE(s.aptitude_score, 0) * 0.20
        + COALESCE(s.verbal_score, 0) * 0.15
        + COALESCE(s.codenow_score, 0) * 0.15
        + COALESCE(s.readiness_score, 0) * 0.15
        + LEAST(100, COALESCE(snap.total_solved, 0)::numeric / 3.0) * 0.10
      ) * 10)::int)) AS fame_xp
    FROM public.student_profiles s
    LEFT JOIN public.student_coding_snapshots snap ON snap.student_profile_id = s.id
    WHERE s.is_active = true
      AND s.is_shareable = true
      AND s.share_token IS NOT NULL
  ),
  ranked AS (
    SELECT
      scored.*,
      CASE
        WHEN fame_xp >= 950 THEN 'Hall of Fame'
        WHEN fame_xp >= 850 THEN 'Legend'
        WHEN fame_xp >= 700 THEN 'Elite'
        WHEN fame_xp >= 550 THEN 'Challenger'
        WHEN fame_xp >= 400 THEN 'Contender'
        ELSE 'Rookie'
      END AS fame_level,
      DENSE_RANK() OVER (
        ORDER BY fame_xp DESC, readiness_score DESC,
          COALESCE(communication_score, 0) DESC, COALESCE(cgpa, 0) DESC, roll_number ASC
      ) AS rank
    FROM scored
  ),
  filtered AS (
    SELECT * FROM ranked
    WHERE v_search IS NULL
      OR roll_number ILIKE '%' || v_search || '%'
      OR full_name ILIKE '%' || v_search || '%'
  )
  SELECT
    (SELECT count(*) FROM filtered),
    COALESCE(jsonb_agg(row_data ORDER BY rank_order), '[]'::jsonb)
  INTO v_total, v_rows
  FROM (
    SELECT
      rank AS rank_order,
      jsonb_build_object(
        'rank', rank,
        'rollNumber', roll_number,
        'fullName', full_name,
        'branch', branch,
        'batch', batch,
        'academicBatch', academic_batch,
        'fameXp', fame_xp,
        'fameLevel', fame_level,
        'readinessScore', readiness_score,
        'readinessStatus', readiness_status,
        'placementStatus', placement_status,
        'communicationScore', communication_score,
        'communicationGrade', communication_grade,
        'aptitudeScore', aptitude_score,
        'aptitudeGrade', aptitude_grade,
        'verbalScore', verbal_score,
        'verbalGrade', verbal_grade,
        'codeNowScore', codenow_score,
        'codeNowGrade', codenow_grade,
        'cgpa', cgpa,
        'totalSolved', total_solved,
        'linkedCount', linked_count,
        'shareToken', share_token
      ) AS row_data
    FROM filtered
    ORDER BY rank, roll_number
    LIMIT v_limit OFFSET v_offset
  ) page;

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'limit', v_limit,
    'offset', v_offset,
    'generatedAt', now(),
    'rows', COALESCE(v_rows, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_leaderboard(text, integer, integer)
  TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'placement_notification_reads'
    )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.placement_notification_reads;
  END IF;
END $$;

DO $$
DECLARE
  v_table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_table_name IN ARRAY ARRAY[
      'communication_evaluations',
      'student_tech_skills',
      'student_coding_snapshots',
      'aptitude_scores',
      'verbal_scores',
      'codenow_profiles',
      'companies',
      'audit_logs'
    ]
    LOOP
      IF to_regclass('public.' || v_table_name) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM pg_publication_tables publication_table
          WHERE publication_table.pubname = 'supabase_realtime'
            AND publication_table.schemaname = 'public'
            AND publication_table.tablename = v_table_name
        )
      THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table_name);
      END IF;
    END LOOP;
  END IF;
END $$;
