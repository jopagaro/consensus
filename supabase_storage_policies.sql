-- Storage RLS policies for the photos bucket

-- Allow authenticated users to upload their own photos
create policy "Users can upload photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'photos');

-- Allow public read access to all photos
create policy "Public can view photos"
on storage.objects for select
to public
using (bucket_id = 'photos');

-- Allow users to delete their own photos
create policy "Users can delete own photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
