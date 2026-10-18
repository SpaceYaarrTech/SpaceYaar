create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  role text check (role in ('owner', 'renter')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  property_type text not null,
  floor_level text not null,
  area_value numeric(14, 2),
  area_unit text,
  length numeric(14, 3),
  breadth numeric(14, 3),
  height numeric(14, 3),
  dimension_unit text,
  temperature numeric(8, 2),
  temperature_unit text check (temperature_unit in ('Celsius', 'Fahrenheit')),
  usage_types text[] not null default '{}',
  loading_features text[] not null default '{}',
  amenities text[] not null default '{}',
  price_model text not null check (price_model in ('Per Day', 'Per Week', 'Per Month', 'Customize')),
  price_amount numeric(14, 2) not null check (price_amount > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  security_amount numeric(14, 2) not null default 0 check (security_amount >= 0),
  refund_within_days integer not null check (refund_within_days > 0),
  availability_days text[] not null default '{}',
  min_booking_days integer not null check (min_booking_days > 0),
  address text not null,
  pincode text,
  city text not null,
  state text not null default '',
  access_instructions text,
  latitude double precision,
  longitude double precision,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_public_search_idx on public.listings (status, city, property_type, price_amount);
create index if not exists listings_owner_created_idx on public.listings (owner_id, created_at desc);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null unique,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_documents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null unique,
  document_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  renter_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (renter_id, listing_id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  renter_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  message text not null default '',
  status text not null default 'requested' check (status in ('requested', 'accepted', 'rejected', 'cancelled', 'completed')),
  quoted_total numeric(14, 2) not null check (quoted_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date > start_date),
  check (renter_id <> owner_id)
);

create index if not exists bookings_renter_created_idx on public.bookings (renter_id, created_at desc);
create index if not exists bookings_owner_created_idx on public.bookings (owner_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.listing_documents enable row level security;
alter table public.favorites enable row level security;
alter table public.bookings enable row level security;

create policy "Profiles are visible to their user" on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy "Users can update their profile" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Published listings are public" on public.listings
for select to anon, authenticated using (status = 'published');
create policy "Owners can read their listings" on public.listings
for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners can create listings" on public.listings
for insert to authenticated with check (
  owner_id = (select auth.uid())
  and status in ('draft', 'pending_review')
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner')
);
create policy "Owners can update their listings" on public.listings
for update to authenticated using (
  owner_id = (select auth.uid()) and status <> 'published'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner')
)
with check (
  owner_id = (select auth.uid()) and status in ('draft', 'pending_review', 'rejected', 'archived')
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner')
);
create policy "Owners can delete their listings" on public.listings
for delete to authenticated using (
  owner_id = (select auth.uid())
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'owner')
);

create policy "Published listing photos are public" on public.listing_photos
for select to anon, authenticated using (
  exists (select 1 from public.listings l where l.id = listing_id and l.status = 'published')
);
create policy "Listing owners can read their photos" on public.listing_photos
for select to authenticated using (
  exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid()))
);
create policy "Listing owners can manage photo metadata" on public.listing_photos
for all to authenticated using (
  exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid()))
) with check (
  exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid()))
);

create policy "Owners can manage their listing documents" on public.listing_documents
for all to authenticated using (
  exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid()))
) with check (
  exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid()))
);

create policy "Users can read their favorites" on public.favorites
for select to authenticated using (renter_id = (select auth.uid()));
create policy "Users can add their favorites" on public.favorites
for insert to authenticated with check (renter_id = (select auth.uid()));
create policy "Users can remove their favorites" on public.favorites
for delete to authenticated using (renter_id = (select auth.uid()));

create policy "Booking participants can read bookings" on public.bookings
for select to authenticated using (renter_id = (select auth.uid()) or owner_id = (select auth.uid()));
create policy "Renters can request bookings for published listings" on public.bookings
for insert to authenticated with check (
  renter_id = (select auth.uid())
  and status = 'requested'
  and exists (
    select 1 from public.listings l
    where l.id = listing_id and l.owner_id = owner_id and l.status = 'published'
  )
);
create policy "Renters can cancel their requests" on public.bookings
for update to authenticated using (renter_id = (select auth.uid()) and status = 'requested')
with check (renter_id = (select auth.uid()) and status in ('requested', 'cancelled'));
create policy "Owners can respond to booking requests" on public.bookings
for update to authenticated using (owner_id = (select auth.uid()) and status = 'requested')
with check (owner_id = (select auth.uid()) and status in ('accepted', 'rejected'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-photos', 'listing-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('kyc-documents', 'kyc-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Anyone can read public listing photos" on storage.objects
for select to anon, authenticated using (bucket_id = 'listing-photos');
create policy "Owners can upload listing photos" on storage.objects
for insert to authenticated with check (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.listings l
    where l.id::text = (storage.foldername(name))[2] and l.owner_id = (select auth.uid())
  )
);
create policy "Owners can update listing photos" on storage.objects
for update to authenticated using (
  bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "Owners can delete listing photos" on storage.objects
for delete to authenticated using (
  bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Owners can manage private KYC documents" on storage.objects
for all to authenticated using (
  bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.listings l
    where l.id::text = (storage.foldername(name))[2] and l.owner_id = (select auth.uid())
  )
);

grant usage on schema public to anon, authenticated;
grant select on public.listings, public.listing_photos to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant insert, update, delete on public.listings to authenticated;
grant insert, update, delete on public.listing_photos to authenticated;
grant select, insert, update, delete on public.listing_documents to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert on public.bookings to authenticated;
grant update (status, updated_at) on public.bookings to authenticated;
