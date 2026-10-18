alter table public.profiles
  add column if not exists business_name text,
  add column if not exists business_type text,
  add column if not exists gst_number text,
  add column if not exists address text,
  add column if not exists profile_photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Anyone can read public profile photos" on storage.objects
for select to anon, authenticated using (bucket_id = 'profile-photos');

create policy "Users can upload their profile photos" on storage.objects
for insert to authenticated with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'profile'
);

create policy "Users can update their profile photos" on storage.objects
for update to authenticated using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'profile'
) with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'profile'
);

create policy "Users can delete their profile photos" on storage.objects
for delete to authenticated using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'profile'
);
