create policy "Owners can view profiles for their booking renters" on public.profiles
for select to authenticated using (
  exists (
    select 1
    from public.bookings b
    where b.renter_id = profiles.id
      and b.owner_id = (select auth.uid())
  )
);
