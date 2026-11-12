-- Pricing & availability additions for the updated listing wizard (handoff §8):
--   * maximum booking duration (new column, nullable — existing rows stay valid)
--   * refund timeline becomes optional when the security deposit is ₹0
--     (still capped at 90 days when a deposit is taken)
--   * record whether the Step 2 total area was manually overridden
-- All changes are additive or relaxing, so existing rows need no backfill.

alter table public.listings
  add column if not exists max_booking_days integer check (max_booking_days is null or max_booking_days > 0),
  add column if not exists area_overridden boolean not null default false;

-- Relax the refund check: allow NULL (no deposit) but keep the 90-day cap.
alter table public.listings
  drop constraint if exists listings_refund_within_days_check;

alter table public.listings
  alter column refund_within_days drop not null;

alter table public.listings
  add constraint listings_refund_within_days_check
  check (refund_within_days is null or (refund_within_days > 0 and refund_within_days <= 90));
