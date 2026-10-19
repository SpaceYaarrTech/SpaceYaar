create table if not exists public.razorpay_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  renter_id uuid not null references public.profiles (id) on delete restrict,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'created' check (status in ('created', 'captured', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists razorpay_payments_booking_idx
  on public.razorpay_payments (booking_id, created_at desc);
create index if not exists razorpay_payments_renter_idx
  on public.razorpay_payments (renter_id, created_at desc);

create table if not exists public.razorpay_webhooks (
  event_id text primary key,
  event text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists public.razorpay_subscriptions (
  razorpay_subscription_id text primary key,
  razorpay_plan_id text,
  customer_id text,
  status text not null,
  current_start timestamptz,
  current_end timestamptz,
  ended_at timestamptz,
  razorpay_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.razorpay_payments enable row level security;
alter table public.razorpay_webhooks enable row level security;
alter table public.razorpay_subscriptions enable row level security;

revoke all on public.razorpay_payments, public.razorpay_webhooks, public.razorpay_subscriptions
  from anon, authenticated;
grant all on public.razorpay_payments, public.razorpay_webhooks, public.razorpay_subscriptions
  to service_role;
