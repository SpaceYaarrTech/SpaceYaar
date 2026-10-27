-- Video support for listing media: each listing_photos row can now be an
-- image or a video, and videos live in their own public bucket with the
-- same 10 MB limit.

alter table public.listing_photos
  add column if not exists media_type text not null default 'image'
  check (media_type in ('image', 'video'));

-- Public bucket for listing videos (renters must be able to stream them).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-videos', 'listing-videos', true, 10485760, array['video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Let image uploads also arrive as HEIC/HEIF/GIF before client-side
-- compression (compression normally converts them to JPEG anyway).
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
where id = 'listing-photos';

-- Storage policies for listing videos, mirroring listing-photos: public
-- read, and each owner may only write inside their own listing folder.
drop policy if exists "Anyone can read listing videos" on storage.objects;
create policy "Anyone can read listing videos" on storage.objects
for select to anon, authenticated using (bucket_id = 'listing-videos');

drop policy if exists "Owners can upload listing videos" on storage.objects;
create policy "Owners can upload listing videos" on storage.objects
for insert to authenticated with check (
  bucket_id = 'listing-videos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.listings l
    where l.id::text = (storage.foldername(name))[2] and l.owner_id = (select auth.uid())
  )
);

drop policy if exists "Owners can update listing videos" on storage.objects;
create policy "Owners can update listing videos" on storage.objects
for update to authenticated using (
  bucket_id = 'listing-videos' and (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id = 'listing-videos' and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Owners can delete listing videos" on storage.objects;
create policy "Owners can delete listing videos" on storage.objects
for delete to authenticated using (
  bucket_id = 'listing-videos' and (storage.foldername(name))[1] = (select auth.uid())::text
);
