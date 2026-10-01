-- Step 5: photos and screenshots shared into Parso. Each user can add files to, and read, only their
-- own folder (<user_id>/<file>). The server reads them with the service role for processing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

create policy "Own uploads: insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Own uploads: select" on storage.objects
  for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
