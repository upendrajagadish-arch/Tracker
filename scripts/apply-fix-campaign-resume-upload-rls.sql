-- Fix campaign resume upload RLS for shared registration links.
-- The previous policy relied on storage metadata fields that are not consistently
-- available during insert checks from browser uploads.

DROP POLICY IF EXISTS "campaign registration resume upload" ON storage.objects;

CREATE POLICY "campaign registration resume upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = 'campaign-reg'
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

