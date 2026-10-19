-- Renter personal information + saved addresses

alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists gender text check (gender in ('male', 'female', 'other'));

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null check (label in ('home', 'office', 'warehouse', 'other')),
  address_line text not null,
  landmark text,
  city text not null,
  state text not null,
  pincode text not null,
  phone text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists addresses_user_id_idx on public.addresses (user_id);

alter table public.addresses enable row level security;

create policy "Users can view their own addresses" on public.addresses
for select to authenticated using (user_id = (select auth.uid()));

create policy "Users can create their own addresses" on public.addresses
for insert to authenticated with check (user_id = (select auth.uid()));

create policy "Users can update their own addresses" on public.addresses
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Users can delete their own addresses" on public.addresses
for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.addresses to authenticated;
