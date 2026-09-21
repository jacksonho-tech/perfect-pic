-- companion photos: readable by everyone (signed URLs), writable by owners/admin
create policy "photos readable" on storage.objects for select
  using (bucket_id = 'companion-photos');
create policy "photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'companion-photos');
create policy "photos update own" on storage.objects for update to authenticated
  using (bucket_id = 'companion-photos' and (owner = auth.uid() or public.has_role(auth.uid(),'admin')));
create policy "photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'companion-photos' and (owner = auth.uid() or public.has_role(auth.uid(),'admin')));

-- ID documents: strictly private, owner folder + admin
create policy "id docs read own" on storage.objects for select to authenticated
  using (bucket_id = 'id-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));
create policy "id docs insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "id docs update own" on storage.objects for update to authenticated
  using (bucket_id = 'id-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));
