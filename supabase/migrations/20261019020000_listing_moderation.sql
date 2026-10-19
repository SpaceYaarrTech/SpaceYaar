create table if not exists public.listing_moderation_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  admin_user_id uuid not null references public.profiles (id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected')),
  reason text,
  created_at timestamptz not null default now(),
  check (
    (decision = 'approved' and reason is null)
    or (decision = 'rejected' and length(trim(reason)) > 0)
  )
);

create index if not exists listing_moderation_events_listing_idx
  on public.listing_moderation_events (listing_id, created_at desc);

alter table public.listing_moderation_events enable row level security;
revoke all on public.listing_moderation_events from anon, authenticated;
grant all on public.listing_moderation_events to service_role;

create or replace function public.moderate_listing(
  p_listing_id uuid,
  p_admin_user_id uuid,
  p_decision text,
  p_reason text default null
)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_reason text := nullif(left(trim(coalesce(p_reason, '')), 500), '');
begin
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'unsupported_moderation_decision';
  end if;
  if p_decision = 'approved' then
    v_reason := null;
  end if;
  if p_decision = 'rejected' and v_reason is null then
    raise exception using errcode = '22023', message = 'rejection_reason_required';
  end if;

  update public.listings
  set status = case when p_decision = 'approved' then 'published' else 'rejected' end,
      updated_at = now()
  where listings.id = p_listing_id and listings.status = 'pending_review'
  returning listings.status into v_status;
  if not found then
    raise exception using errcode = 'P0002', message = 'pending_listing_not_found';
  end if;

  insert into public.listing_moderation_events (listing_id, admin_user_id, decision, reason)
  values (p_listing_id, p_admin_user_id, p_decision, v_reason);

  return query select p_listing_id, v_status;
end;
$$;

revoke all on function public.moderate_listing(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.moderate_listing(uuid, uuid, text, text) to service_role;
