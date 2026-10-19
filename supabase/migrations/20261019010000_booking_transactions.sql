create or replace function public.create_booking_request(
  p_listing_id uuid,
  p_start_date date,
  p_end_date date,
  p_message text default ''
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_days integer;
  v_units integer;
  v_total numeric(14, 2);
  v_booking public.bookings%rowtype;
  v_weekday text;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'sign_in_required';
  end if;
  if p_start_date is null or p_end_date is null or p_end_date <= p_start_date then
    raise exception using errcode = '22023', message = 'invalid_booking_dates';
  end if;
  if p_start_date < current_date then
    raise exception using errcode = '22023', message = 'booking_start_date_in_past';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and role = 'renter'
  ) then
    raise exception using errcode = '42501', message = 'renter_role_required';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id and status = 'published'
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'published_listing_not_found';
  end if;
  if v_listing.owner_id = v_user_id then
    raise exception using errcode = '42501', message = 'cannot_book_own_listing';
  end if;

  v_days := p_end_date - p_start_date;
  if v_days < v_listing.min_booking_days then
    raise exception using errcode = '22023', message = 'minimum_booking_duration_not_met';
  end if;

  for v_weekday in
    select case extract(dow from day_date)::integer
      when 0 then 'Sun'
      when 1 then 'Mon'
      when 2 then 'Tues'
      when 3 then 'Wed'
      when 4 then 'Thu'
      when 5 then 'Fri'
      when 6 then 'Sat'
    end
    from generate_series(p_start_date, p_end_date - 1, interval '1 day') as dates(day_date)
  loop
    if not (v_weekday = any(v_listing.availability_days)) then
      raise exception using errcode = 'P0001', message = 'booking_dates_unavailable';
    end if;
  end loop;

  if v_listing.price_model = 'Per Day' then
    v_units := v_days;
  elsif v_listing.price_model = 'Per Week' then
    v_units := ceil(v_days::numeric / 7)::integer;
  elsif v_listing.price_model = 'Per Month' then
    v_units := ceil(v_days::numeric / 30)::integer;
  else
    raise exception using errcode = '22023', message = 'listing_requires_custom_quote';
  end if;
  v_total := round(v_listing.price_amount * v_units, 2);
  if v_total <= 0 then
    raise exception using errcode = '22023', message = 'invalid_booking_price';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.listing_id = v_listing.id
      and b.status = 'accepted'
      and b.start_date < p_end_date
      and b.end_date > p_start_date
  ) then
    raise exception using errcode = 'P0001', message = 'booking_dates_unavailable';
  end if;

  insert into public.bookings (
    listing_id, renter_id, owner_id, start_date, end_date, message, quoted_total
  ) values (
    v_listing.id, v_user_id, v_listing.owner_id, p_start_date, p_end_date,
    left(coalesce(p_message, ''), 500), v_total
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

create or replace function public.transition_booking(
  p_booking_id uuid,
  p_next_status text
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_owner_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'sign_in_required';
  end if;
  if p_next_status is null or p_next_status not in ('accepted', 'rejected', 'cancelled') then
    raise exception using errcode = '22023', message = 'unsupported_booking_transition';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'booking_not_found';
  end if;
  if v_booking.status <> 'requested' then
    raise exception using errcode = 'P0001', message = 'booking_is_not_pending';
  end if;

  if p_next_status = 'cancelled' then
    if v_booking.renter_id <> v_user_id then
      raise exception using errcode = '42501', message = 'only_renter_can_cancel_request';
    end if;
  else
    if v_booking.owner_id <> v_user_id then
      raise exception using errcode = '42501', message = 'only_owner_can_respond';
    end if;
    if not exists (
      select 1 from public.profiles
      where id = v_user_id and role = 'owner'
    ) then
      raise exception using errcode = '42501', message = 'owner_role_required';
    end if;

    if p_next_status = 'accepted' then
      select owner_id into v_owner_id
      from public.listings
      where id = v_booking.listing_id
      for update;
      if not found or v_owner_id <> v_user_id then
        raise exception using errcode = '42501', message = 'only_listing_owner_can_accept';
      end if;

      if exists (
        select 1 from public.bookings b
        where b.listing_id = v_booking.listing_id
          and b.id <> v_booking.id
          and b.status = 'accepted'
          and b.start_date < v_booking.end_date
          and b.end_date > v_booking.start_date
      ) then
        raise exception using errcode = 'P0001', message = 'booking_dates_unavailable';
      end if;
    end if;
  end if;

  update public.bookings
  set status = p_next_status, updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.create_booking_request(uuid, date, date, text) from public, anon;
revoke all on function public.transition_booking(uuid, text) from public, anon;
grant execute on function public.create_booking_request(uuid, date, date, text) to authenticated;
grant execute on function public.transition_booking(uuid, text) to authenticated;

revoke insert, update on public.bookings from authenticated;
drop policy if exists "Renters can request bookings for published listings" on public.bookings;
drop policy if exists "Renters can cancel their requests" on public.bookings;
drop policy if exists "Owners can respond to booking requests" on public.bookings;
