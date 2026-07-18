-- Premium placement dashboard operational domains.
-- Drives, company links shared with students, notifications, and realtime updates.

CREATE TABLE IF NOT EXISTS public.placement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  requirement_id uuid REFERENCES public.company_requirements(id) ON DELETE SET NULL,
  title text NOT NULL,
  event_type text NOT NULL DEFAULT 'drive'
    CHECK (event_type IN ('drive', 'pre_placement_talk', 'test', 'interview', 'workshop')),
  mode text NOT NULL DEFAULT 'on_campus'
    CHECK (mode IN ('on_campus', 'off_campus', 'virtual')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  venue text NOT NULL DEFAULT '',
  meeting_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  audience_batches text[] NOT NULL DEFAULT '{}',
  audience_branches text[] NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.company_requirements(id) ON DELETE SET NULL,
  label text NOT NULL DEFAULT '',
  url text NOT NULL,
  audience_batches text[] NOT NULL DEFAULT '{}',
  audience_branches text[] NOT NULL DEFAULT '{}',
  shared_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  click_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.placement_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  audience_role text,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  notification_type text NOT NULL DEFAULT 'info'
    CHECK (notification_type IN ('info', 'success', 'warning', 'drive', 'company', 'student')),
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  action_url text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS placement_events_starts_idx
  ON public.placement_events(starts_at);
CREATE INDEX IF NOT EXISTS placement_events_status_mode_idx
  ON public.placement_events(status, mode);
CREATE INDEX IF NOT EXISTS company_share_links_shared_idx
  ON public.company_share_links(shared_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS placement_notifications_recipient_idx
  ON public.placement_notifications(recipient_user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS placement_notifications_role_idx
  ON public.placement_notifications(audience_role, created_at DESC);

DROP TRIGGER IF EXISTS placement_events_set_updated_at ON public.placement_events;
CREATE TRIGGER placement_events_set_updated_at
  BEFORE UPDATE ON public.placement_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS company_share_links_set_updated_at ON public.company_share_links;
CREATE TRIGGER company_share_links_set_updated_at
  BEFORE UPDATE ON public.company_share_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.placement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff view placement events" ON public.placement_events;
CREATE POLICY "staff view placement events"
  ON public.placement_events FOR SELECT
  USING (public.current_app_role()::text IN ('admin', 'tpo', 'faculty', 'interviewer'));

DROP POLICY IF EXISTS "admin tpo manage placement events" ON public.placement_events;
CREATE POLICY "admin tpo manage placement events"
  ON public.placement_events FOR ALL
  USING (public.current_app_role()::text IN ('admin', 'tpo'))
  WITH CHECK (public.current_app_role()::text IN ('admin', 'tpo'));

DROP POLICY IF EXISTS "staff view company share links" ON public.company_share_links;
CREATE POLICY "staff view company share links"
  ON public.company_share_links FOR SELECT
  USING (public.current_app_role()::text IN ('admin', 'tpo', 'faculty', 'interviewer'));

DROP POLICY IF EXISTS "admin tpo manage company share links" ON public.company_share_links;
CREATE POLICY "admin tpo manage company share links"
  ON public.company_share_links FOR ALL
  USING (public.current_app_role()::text IN ('admin', 'tpo'))
  WITH CHECK (public.current_app_role()::text IN ('admin', 'tpo'));

DROP POLICY IF EXISTS "staff read own or role notifications" ON public.placement_notifications;
CREATE POLICY "staff read own or role notifications"
  ON public.placement_notifications FOR SELECT
  USING (
    recipient_user_id = auth.uid()
    OR audience_role = public.current_app_role()::text
    OR public.current_app_role()::text IN ('admin', 'tpo')
  );

DROP POLICY IF EXISTS "staff update own notifications" ON public.placement_notifications;
CREATE POLICY "staff update own notifications"
  ON public.placement_notifications FOR UPDATE
  USING (
    recipient_user_id = auth.uid()
    OR audience_role = public.current_app_role()::text
    OR public.current_app_role()::text IN ('admin', 'tpo')
  )
  WITH CHECK (
    recipient_user_id = auth.uid()
    OR audience_role = public.current_app_role()::text
    OR public.current_app_role()::text IN ('admin', 'tpo')
  );

DROP POLICY IF EXISTS "admin tpo create notifications" ON public.placement_notifications;
CREATE POLICY "admin tpo create notifications"
  ON public.placement_notifications FOR INSERT
  WITH CHECK (public.current_app_role()::text IN ('admin', 'tpo'));

CREATE OR REPLACE FUNCTION public.get_placement_dashboard(p_batch text DEFAULT 'all')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH cohort AS (
    SELECT *
    FROM public.student_profiles sp
    WHERE sp.is_active = true
      AND (
        p_batch = 'all'
        OR COALESCE(
          sp.graduation_year::text,
          substring(sp.academic_batch FROM '([0-9]{4})$'),
          substring(sp.batch FROM '([0-9]{4})$'),
          sp.batch
        ) = p_batch
      )
  ),
  student_counts AS (
    SELECT
      count(*)::int AS total_students,
      count(*) FILTER (WHERE readiness_score >= 60)::int AS above_60,
      count(*) FILTER (WHERE readiness_score >= 70)::int AS above_70,
      count(*) FILTER (WHERE readiness_score >= 80)::int AS above_80,
      count(*) FILTER (WHERE upper(placement_status) IN ('PLACED', 'OFFERED'))::int AS placed
    FROM cohort
  ),
  operational_counts AS (
    SELECT
      (SELECT count(*)::int FROM public.company_share_links csl
        WHERE csl.is_active
          AND (csl.expires_at IS NULL OR csl.expires_at > now())
          AND (p_batch = 'all' OR cardinality(csl.audience_batches) = 0 OR p_batch = ANY(csl.audience_batches))
      ) AS company_links,
      (SELECT count(DISTINCT pe.company_id)::int FROM public.placement_events pe
        WHERE pe.mode = 'on_campus' AND pe.status <> 'cancelled'
          AND (p_batch = 'all' OR cardinality(pe.audience_batches) = 0 OR p_batch = ANY(pe.audience_batches))
      ) AS on_campus_companies,
      (SELECT count(*)::int FROM public.placement_events pe
        WHERE pe.starts_at >= now() AND pe.status = 'scheduled'
          AND (p_batch = 'all' OR cardinality(pe.audience_batches) = 0 OR p_batch = ANY(pe.audience_batches))
      ) AS upcoming_drives
  )
  SELECT jsonb_build_object(
    'batch', p_batch,
    'totalStudents', sc.total_students,
    'above60', sc.above_60,
    'above70', sc.above_70,
    'above80', sc.above_80,
    'placed', sc.placed,
    'unplaced', greatest(0, sc.total_students - sc.placed),
    'placementPercentage', CASE WHEN sc.total_students = 0 THEN 0 ELSE round(sc.placed * 100.0 / sc.total_students)::int END,
    'companyLinks', oc.company_links,
    'onCampusCompanies', oc.on_campus_companies,
    'upcomingDrives', oc.upcoming_drives,
    'refreshedAt', now()
  )
  FROM student_counts sc CROSS JOIN operational_counts oc;
$$;

REVOKE ALL ON FUNCTION public.get_placement_dashboard(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_placement_dashboard(text) TO authenticated;

-- Supabase Realtime publication additions are idempotent through catalog checks.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'placement_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.placement_events;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'company_share_links'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.company_share_links;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'placement_notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.placement_notifications;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_profiles'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.student_profiles;
    END IF;
  END IF;
END $$;
