-- Supabase Storage bucket for student resumes

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

-- Staff (admin/tpo) can upload and read resumes
create policy "placement staff upload resumes"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and public.has_placement_permission('manage_students')
  );

create policy "placement staff read resumes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and public.has_placement_permission('view_students')
  );

create policy "placement staff update resumes"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'resumes'
    and public.has_placement_permission('manage_students')
  );

create policy "placement staff delete resumes"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and public.has_placement_permission('manage_students')
  );

-- Students can upload/read their own resume objects (path prefix = user id)
create policy "students manage own resume files"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'resumes'
    and public.current_app_role() = 'student'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'resumes'
    and public.current_app_role() = 'student'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
