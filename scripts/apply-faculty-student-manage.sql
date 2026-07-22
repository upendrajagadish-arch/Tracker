-- Apply in Supabase SQL Editor on project idkvhuibqponkhseigox
-- Faculty can create/update students for training-program bulk upload.

DROP POLICY IF EXISTS "tpo admin manage students" ON public.student_profiles;
DROP POLICY IF EXISTS "staff manage students" ON public.student_profiles;

CREATE POLICY "staff manage students"
  ON public.student_profiles
  FOR ALL
  USING (public.current_app_role() IN ('admin', 'tpo', 'faculty'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo', 'faculty'));

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
    WHEN '  students:create: THEN RETURN r IN ('tpo', 'faculty');
    WHEN 'students:update' THEN RETURN r IN ('tpo', 'faculty');
    WHEN 'students:import' THEN RETURN r IN ('tpo', 'faculty');
    WHEN 'students:export' THEN RETURN r = 'tpo';
    WHEN 'students:delete' THEN RETURN r IN ('tpo');

    WHEN 'reports:view' THEN RETURN r IN ('tpo', 'faculty');
    WHEN 'reports:export' THEN RETURN r = 'tpo';
    WHEN 'companies:manage' THEN RETURN r = 'tpo';
    WHEN 'matching:run' THEN RETURN r = 'tpo';
    ELSE RETURN false;
  END CASE;
END;
$$;
