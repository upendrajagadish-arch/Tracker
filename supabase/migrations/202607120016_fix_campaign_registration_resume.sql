-- Fix campaign registration resume attach + staff storage access for resumes.

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

-- Keep old signature working for any in-flight clients, but prefer student id.
DROP FUNCTION IF EXISTS public.register_public_campaign_registration_resume(uuid, text, text, text, text, int);

GRANT EXECUTE ON FUNCTION public.register_public_campaign_registration_resume(uuid, uuid, text, text, text, int) TO anon, authenticated;

-- Fix staff storage policies (wrong permission names blocked TPO/faculty resume access).
DROP POLICY IF EXISTS "placement staff upload resumes" ON storage.objects;
CREATE POLICY "placement staff upload resumes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND public.current_app_role() IN ('admin', 'tpo')
  );

DROP POLICY IF EXISTS "placement staff read resumes" ON storage.objects;
CREATE POLICY "placement staff read resumes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (
      public.current_app_role() IN ('admin', 'tpo', 'faculty')
      OR public.has_placement_permission('students:view')
    )
  );

DROP POLICY IF EXISTS "placement staff update resumes" ON storage.objects;
CREATE POLICY "placement staff update resumes"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND public.current_app_role() IN ('admin', 'tpo')
  );

DROP POLICY IF EXISTS "placement staff delete resumes" ON storage.objects;
CREATE POLICY "placement staff delete resumes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND public.current_app_role() IN ('admin', 'tpo')
  );

-- Ensure campaign registration uploads remain allowed.
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
  );
