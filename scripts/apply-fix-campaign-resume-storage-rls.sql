-- Fix campaign-reg resume upload 403 (RLS).
-- Cause: storage policy EXISTS on student_profiles / campaigns runs as anon,
-- and anon cannot read those tables under RLS — so INSERT always fails.
--
-- Fix: check via SECURITY DEFINER helper (bypasses table RLS safely).
-- Run this in Supabase SQL Editor, then retry register + resume upload.

BEGIN;

-- Ensure upload-token columns exist (no-op if already applied)
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS campaign_resume_upload_token text,
  ADD COLUMN IF NOT EXISTS campaign_resume_upload_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS campaign_resume_upload_campaign_id uuid;

CREATE OR REPLACE FUNCTION public.can_upload_campaign_registration_resume(
  p_object_name text,
  p_mimetype text DEFAULT NULL,
  p_size bigint DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts text[];
  campaign_id_text text;
  student_id_text text;
  mime text := lower(trim(COALESCE(p_mimetype, '')));
  sz bigint := COALESCE(p_size, 0);
BEGIN
  IF p_object_name IS NULL OR p_object_name = '' THEN
    RETURN false;
  END IF;

  parts := storage.foldername(p_object_name);
  IF parts IS NULL OR array_length(parts, 1) < 3 THEN
    RETURN false;
  END IF;
  IF parts[1] IS DISTINCT FROM 'campaign-reg' THEN
    RETURN false;
  END IF;

  campaign_id_text := parts[2];
  student_id_text := parts[3];

  -- Mime/size: prefer explicit args; fall back to allowing when metadata missing
  -- (RPC still validates). Empty mime is allowed here to avoid false 403s.
  IF mime <> '' AND mime NOT IN (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) THEN
    RETURN false;
  END IF;

  IF sz < 0 OR sz > 10485760 THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.student_update_campaigns campaign
    JOIN public.student_profiles student
      ON student.id::text = student_id_text
    WHERE campaign.id::text = campaign_id_text
      AND campaign.status = 'active'
      AND (campaign.expires_at IS NULL OR campaign.expires_at > now())
      AND COALESCE(campaign.allowlisted_fields, '[]'::jsonb) ? 'resume'
      AND student.is_active = true
      AND student.registered_via_campaign_id = campaign.id
      AND student.campaign_resume_upload_token IS NOT NULL
      AND student.campaign_resume_upload_expires_at IS NOT NULL
      AND student.campaign_resume_upload_expires_at > now()
      AND student.campaign_resume_upload_campaign_id = campaign.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_upload_campaign_registration_resume(text, text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_upload_campaign_registration_resume(text, text, bigint) TO anon, authenticated;

DROP POLICY IF EXISTS "campaign registration resume read" ON storage.objects;
DROP POLICY IF EXISTS "campaign registration resume upload" ON storage.objects;

CREATE POLICY "campaign registration resume upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = 'campaign-reg'
    AND public.can_upload_campaign_registration_resume(
      name,
      COALESCE(metadata->>'mimetype', metadata->>'contentType'),
      COALESCE((metadata->>'size')::bigint, 0)
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
