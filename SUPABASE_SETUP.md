# Supabase setup

The app uses Supabase for Auth, Postgres, and Storage. Browser code uses only the publishable key and relies on row-level security. A small set of server-only routes use the service-role key for webhook/payment storage, admin listing review, private document signing, and accepted-booking contact lookup. Never expose that key to browser code or place it in a `NEXT_PUBLIC_` variable.

## Create the project

1. Create a Supabase account and a project. Choose a region close to the first users (for SpaceYaar, Mumbai if available).
2. In the project dashboard, open **SQL Editor** and run every migration in timestamp order (listed in [Data and API behavior](#data-and-api-behavior)).
3. In **Project Settings → API**, copy the Project URL and publishable key. Keep the secret/service-role key private and do not place it in any `NEXT_PUBLIC_` variable.
4. Create a local `.env.local` from `.env.example` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_project_key
NEXT_PUBLIC_AUTH_BYPASS=false
```

`.env.local` is git-ignored. Restart `npm run dev` after adding it.

For local UI-flow testing without Supabase authentication, set `NEXT_PUBLIC_AUTH_BYPASS=true` in `.env.local` and restart the dev server. This development-only option adds a login shortcut and skips saving the selected role to Supabase. It only allows navigation through those screens; API-backed features still require a real Supabase session. The bypass is disabled outside `next dev`, even if the variable is set.

## Configure authentication

In **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` for local development and add `http://localhost:3000/auth/callback` to Redirect URLs. Before production, add the Vercel production domain callback URL and the custom-domain callback URL.

Email/password auth uses Supabase Auth. For production email delivery, configure a custom SMTP sender and verify its DNS records.

Google and Facebook buttons require OAuth applications. Create each provider application and enter its client ID/secret in **Authentication → Providers**. Configure the callback URL shown by Supabase in the provider console. Leave a provider disabled until its credentials are configured.

Phone OTP sends a six-digit SMS through the SMS provider configured in Supabase Auth. This requires a supported SMS vendor account and can incur per-message charges; it is not included in the free hosting plan.

## Data and API behavior

Apply all migrations in timestamp order:

1. `20261017000000_initial_schema.sql`
2. `20261018000000_owner_renter_profiles.sql`
3. `20261018010000_host_business_profile.sql`
4. `20261019000000_razorpay_payments.sql`
5. `20261019010000_booking_transactions.sql`
6. `20261019020000_listing_moderation.sql`

The migrations create profile, listing, photo metadata, private KYC metadata, favorites, booking, payment and moderation tables with RLS. They create a public `listing-photos` bucket and a private `kyc-documents` bucket.

API routes cover profile role updates, published listing reads, owner listing drafts and submission, media metadata, favorites, booking requests/status updates, and listing moderation. New owner submissions become `pending_review` and are not exposed to renters until approved.

For the internal review screen, add one or more Supabase Auth user UUIDs to the server-only environment variable `SPACEYAAR_ADMIN_USER_IDS`, separated by commas. In the app, open **Owner → Dashboard** and tap **Host Dashboard** three times quickly. The gesture only opens the screen; every admin API call independently checks the allowlist. Do not put admin user IDs in a `NEXT_PUBLIC_` variable.

Renter Search and Saved Spaces use published listings and the existing `favorites` table. Saved collection cards are derived from each renter's saved listings by city and property type; there is no separate user-created collection feature. Map markers are only shown for listings with stored latitude and longitude. Booking history uses canonical booking statuses and accepted booking dates; calling an owner requires the server-only service-role key. The app does not yet have an in-app messaging/conversation backend, so the Chat Owner action reports that messaging is unavailable instead of creating a fake conversation.

Booking requests and Razorpay Checkout for owner-accepted bookings are implemented. Booking database functions validate renter role, published listing, future date range, minimum duration, configured weekdays, pricing and conflicts. Listing acceptance serializes on the listing record so two overlapping requests cannot both be accepted. Payment, webhook, subscription and moderation audit tables are only writable by the Supabase service role; never expose that key to browser code.

Set the following server environment variables in `.env.local` and in the production deployment:

```env
SUPABASE_SERVICE_ROLE_KEY=your_private_supabase_service_role_key
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_private_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

Use Razorpay test keys for testing, then replace them with live keys after merchant onboarding. Configure a Razorpay webhook pointing to `/api/payments/razorpay/webhook`, using the same webhook secret, and subscribe to `payment.captured`, `payment.failed`, and the desired `subscription.*` events. Payment amount and eligibility are read server-side from an accepted booking; client-supplied amounts are never used. Subscription events are stored in `razorpay_subscriptions`, while every verified webhook is deduplicated in `razorpay_webhooks`. Creating customer-facing subscriptions/plans is not part of the booking checkout flow.

## Owner and renter happy-flow test

1. Apply every migration above and configure the public Supabase URL/key, service-role key, `SPACEYAAR_ADMIN_USER_IDS`, and Razorpay **test** key ID/secret in `.env.local`. Restart the app after environment changes.
2. Create two separate Supabase Auth accounts with verified phone numbers: one owner and one renter. Configure the Supabase SMS/email provider and local callback URLs as needed.
3. Sign in as the owner, select **I have a space**, finish owner onboarding, and submit a listing with at least one photo and one KYC document. Use a supported rate model (`Per Day`, `Per Week`, or `Per Month`) and select the weekdays that cover the renter's chosen dates.
4. Sign in as an allowlisted reviewer and open **Owner → Dashboard**. For a quick local test, the owner account can also be the allowlisted reviewer; use a separate reviewer account in shared/staging environments. Tap **Host Dashboard** three times quickly, review the pending listing/documents and choose **Approve and publish**.
5. Sign out, sign in as the renter, select **I need a space**, find the published listing, and submit a request for available dates that meet the minimum stay.
6. Sign back in as the owner, open **Renters**, and accept the request.
7. Sign in as the renter, open **My Bookings**, and pay using Razorpay test checkout. Verify that the booking shows paid after provider verification/webhook processing.

Each account must use its own browser session. Use a real configured Razorpay test account; the app does not simulate successful payments.

## Production checklist

- Add the two public Supabase environment variables to Vercel after the project is ready.
- Add the production and custom domains to Supabase Auth's redirect allow list.
- Configure OAuth credentials, SMS delivery, and production email SMTP as needed.
- Review RLS and storage policies in the Supabase dashboard after applying the migration.
- Use Supabase backups and test account deletion/data retention before handling real KYC documents.
