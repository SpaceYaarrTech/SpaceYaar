-- Review progress tracking and owner notifications for the admin approval flow.

-- Granular review stages recorded by admins while reviewing a listing:
--   viewed          -> admin opened the photos/documents
--   assets_approved -> admin approved the photos/documents (before final publish)
create table if not exists public.listing_review_progress (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  stage text not null check (stage in ('viewed', 'assets_approved')),
  admin_user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (listing_id, stage)
);

create index if not exists listing_review_progress_listing_idx
  on public.listing_review_progress (listing_id, created_at);

alter table public.listing_review_progress enable row level security;

drop policy if exists "Owners can read their listing review progress" on public.listing_review_progress;
create policy "Owners can read their listing review progress" on public.listing_review_progress
for select to authenticated using (
  exists (
    select 1
    from public.listings l
    where l.id = public.listing_review_progress.listing_id
      and l.owner_id = (select auth.uid())
  )
);

revoke all on public.listing_review_progress from anon;
grant select on public.listing_review_progress to authenticated;
grant all on public.listing_review_progress to service_role;

-- In-app notifications for owners. Only the server (service role) inserts;
-- owners read their own and mark them read.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('listing_viewed', 'assets_approved', 'listing_approved', 'listing_rejected')),
  title text not null,
  body text not null default '',
  link text,
  listing_id uuid references public.listings (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications" on public.notifications
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications" on public.notifications
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.notifications from anon;
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- Reviewer outcome stored on the listing itself so the owner can see it
-- (shown on /api/listings/mine, which the owner reads through RLS).
alter table public.listings add column if not exists rejection_reason text;
alter table public.listings add column if not exists reviewed_at timestamptz;
