# Supabase and external services setup

The app uses Supabase for Auth, Postgres, and Storage. Browser code uses only the publishable key and relies on row-level security. A small set of server-only routes use the service-role key for webhook/payment storage, admin listing review, private document signing, and accepted-booking contact lookup. Never expose that key to browser code or place it in a `NEXT_PUBLIC_` variable.

## Required services and settings

| Service | Needed for | Setup |
| --- | --- | --- |
| Supabase | Sign-in, profiles, listings, storage, bookings, and payment records | Complete the Supabase steps below, including migrations and both public and server-only keys. |
| Razorpay | Taking booking payments | Create test-mode API keys and configure a webhook as described in [Razorpay setup](#razorpay-setup-test-mode). |
| App hosting | A shareable production/staging app URL and production webhook receiver | Deploy the Next.js app (the production checklist below assumes Vercel); add all server and public environment variables to the hosting project. |

Email/password sign-in uses Supabase Auth. Google/Facebook OAuth, production email delivery, and phone OTP/SMS require separate provider configuration only if you want to use those sign-in methods. Map tiles and address search use OpenStreetMap services, and the browser's location picker uses its built-in geolocation permission; neither needs an app API key. Respect the OpenStreetMap tile and Nominatim usage policies, especially for production traffic.

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

`.env.local` is git-ignored. Start the app with `npm run dev` and open `http://localhost:3000`; restart the dev server after changing environment values.

For local UI-flow testing without Supabase authentication, set `NEXT_PUBLIC_AUTH_BYPASS=true` in `.env.local` and restart the dev server. This development-only option adds a login shortcut and skips saving the selected role to Supabase. It only allows navigation through those screens; API-backed features still require a real Supabase session. The bypass is disabled outside `next dev`, even if the variable is set.

## Configure authentication

The app uses **Supabase Auth** for email/password, email confirmation, phone OTP and optional Google/Facebook OAuth. No Firebase project or Firebase client SDK is needed. The app's browser/server clients already share Supabase sessions with the database, so the existing booking, listing and RLS flows continue to use the same user identity.

### Set the allowed URLs

In **Authentication → URL Configuration**:

1. Set the local Site URL to `http://localhost:3000` while developing locally.
2. Add `http://localhost:3000/auth/callback` to Redirect URLs. Email signup passes this callback URL and the app exchanges Supabase's confirmation code for a session.
3. Before deploying, set the production Site URL to the app's canonical HTTPS domain and add `https://YOUR_APP_HOST/auth/callback` to Redirect URLs. Add preview domains only if you will use them; use narrow patterns and do not allow arbitrary redirect URLs.

### Enable and test email confirmation

1. In **Authentication → Providers → Email**, enable email/password sign-in and enable **Confirm email**. This ensures a new password account must click the confirmation link before it can sign in.
2. In **Authentication → Email Templates**, check the **Confirm signup** template and make sure its action link returns users to the configured callback. If you customize the template, preserve Supabase's confirmation link/token placeholders.
3. For a local test, open `/signup`, create an account with an inbox you can access, click the confirmation link, and confirm the browser returns to `/role-selection`. Then sign out and verify email/password login works.
4. The app displays a check-your-email message when Supabase creates the account without an active session. If confirmation is disabled, Supabase may return a session immediately, and signup continues directly to role selection.

Supabase's built-in email sender is intended for evaluation and has sending/recipient limits. Before relying on verification emails for real users, configure a custom SMTP sender under **Project Settings → Authentication → SMTP Settings** (or the current Auth SMTP settings page), verify the sender domain/DNS with your email provider, and test delivery to common inboxes. Confirm current Supabase and SMTP-provider quotas/prices in their dashboards; email-provider credits and Supabase plan credits may be separate.

### Enable phone OTP

1. In **Authentication → Providers → Phone**, enable phone sign-in.
2. Configure a supported SMS vendor in the provider settings (for example Twilio, Twilio Verify, Vonage, or another provider listed in the dashboard). Create the vendor account, complete any sender/number setup, and enter its credentials in Supabase's dashboard settings—not in the app or `.env.local`.
3. Check the vendor's current free allowance, supported destinations, delivery limits, and per-message charges before testing. Supabase configures the integration; the SMS provider sends and bills the messages.
4. The login form currently collects Indian mobile numbers and submits them to Supabase in `+91` E.164 format. Test with a phone number that can receive SMS. Enter the six-digit code in the app to complete sign-in.
5. Configure sensible OTP rate limits and CAPTCHA under Supabase Auth protection settings before public launch. For India, check applicable telecom/SMS sender and DLT requirements with the SMS vendor.

The app requests OTP with Supabase `signInWithOtp` and verifies it using `verifyOtp`; verification creates the Supabase session used by protected APIs. Supabase's default resend/rate limits apply unless changed in the dashboard. Do not repeatedly request codes during testing.

### Optional social providers

Google and Facebook buttons require separate OAuth applications. Create each provider application, enter its client ID/secret in **Authentication → Providers**, and configure the callback URL shown by Supabase in the provider console. Leave a provider disabled until its credentials and redirect URLs are configured.

## Data and API behavior

Apply all migrations in timestamp order:

1. `20261017000000_initial_schema.sql`
2. `20261018000000_owner_renter_profiles.sql`
3. `20261018010000_host_business_profile.sql`
4. `20261019000000_razorpay_payments.sql`
5. `20261019010000_booking_transactions.sql`
6. `20261019020000_listing_moderation.sql`
7. `20261020000000_renter_profile_addresses.sql`
8. `20261028000000_review_progress_notifications.sql`
9. `20261029000000_listing_videos_media_type.sql`

The migrations create profile, listing, photo metadata, private KYC metadata, favorites, booking, payment and moderation tables with RLS. They create a public `listing-photos` bucket and a private `kyc-documents` bucket.

API routes cover profile role updates, published listing reads, owner listing drafts and submission, media metadata, favorites, booking requests/status updates, and listing moderation. New owner submissions become `pending_review` and are not exposed to renters until approved.

Listing media supports photos and videos. Videos (MP4/WebM/MOV) are capped at 10 MB and stored in the public `listing-videos` bucket; photos are compressed in the browser (max 1920px, JPEG) before upload so owners on slow connections send fewer bytes. A submission needs at least two media items including at least one photo, plus an Aadhaar card — all other KYC documents are optional. Listing reads degrade gracefully if this migration is not applied yet.

The admin review portal lives at `/admin/review`. Access is allowlisted by account email: the built-in default is `spaceyaarr@gmail.com`, and the server-only `SPACEYAAR_ADMIN_EMAILS` environment variable (comma-separated) replaces that list when set. `SPACEYAAR_ADMIN_USER_IDS` still works for raw Supabase user UUIDs. Never put either value in a `NEXT_PUBLIC_` variable — every admin API route re-checks the allowlist server-side, and the page redirects signed-out visitors to `/login`. In the app, open **Owner → Dashboard** and tap **Host Dashboard** three times quickly to reach the screen, or navigate to `/admin/review` directly.

While reviewing, opening a photo or document records a `viewed` stage, "Approve photos & documents" records `assets_approved`, and "Approve and publish" flips the listing to `published` (the `moderate_listing` RPC) and notifies the owner. Owners watch these stages live on `/owner/submitted/[id]`, which polls while review is pending and shows a "View your listing" button once the listing is live. Rejections store `listings.rejection_reason` (shown to the owner) and create a notification; resubmitting through `POST /api/listings/[id]/submit` clears the reason and resets the review stages.

Renter Search and Saved Spaces use published listings and the existing `favorites` table. Saved collection cards are derived from each renter's saved listings by city and property type; there is no separate user-created collection feature. Map markers are only shown for listings with stored latitude and longitude. Booking history uses canonical booking statuses and accepted booking dates; calling an owner requires the server-only service-role key. The app does not yet have an in-app messaging/conversation backend, so the Chat Owner action reports that messaging is unavailable instead of creating a fake conversation.

Booking requests and Razorpay Checkout for owner-accepted bookings are implemented. Booking database functions validate renter role, published listing, future date range, minimum duration, configured weekdays, pricing and conflicts. Listing acceptance serializes on the listing record so two overlapping requests cannot both be accepted. Payment, webhook, subscription and moderation audit tables are only writable by the Supabase service role; never expose that key to browser code.

## Razorpay setup (test mode)

Use test mode for the first happy-flow run. Do not use live credentials until the merchant account has completed Razorpay's onboarding and your production domain, legal/business details, settlement account, and customer-facing policies are ready.

1. Sign in to the [Razorpay Dashboard](https://dashboard.razorpay.com/) and switch to **Test Mode**. Keep the dashboard in test mode while creating credentials and configuring the test webhook.
2. Open the API key settings for test mode and generate a key pair. Copy the **Key ID** and **Key Secret** when displayed; the secret may not be shown again. The test Key ID should identify itself as a test key (commonly `rzp_test_...`).
3. In the test dashboard's **Webhooks** settings, add this endpoint:
   - Production/staging: `https://YOUR_APP_HOST/api/payments/razorpay/webhook`
   - Local development: expose your running app through a temporary HTTPS tunnel, then use `https://YOUR_TUNNEL_HOST/api/payments/razorpay/webhook`. Razorpay cannot call `localhost`. Keep the tunnel running while testing and do not use an untrusted/public tunnel for real customer data.
4. Set a strong webhook secret in the Razorpay dashboard and copy that same value for the app's `RAZORPAY_WEBHOOK_SECRET`. This is a separate secret from the API Key Secret. Subscribe to `payment.captured` and `payment.failed`. Subscription events are only needed if subscription processing is introduced; this app does not currently create customer-facing subscriptions.
5. Put the test Key ID, Key Secret, and webhook secret in `.env.local` as the server-side variables below. Do not add a `NEXT_PUBLIC_` prefix, paste secrets into chat, or commit them. Restart `npm run dev` after changing environment variables.
6. Complete a test checkout and inspect the webhook delivery log in Razorpay. The webhook should receive HTTP 200. If using a local tunnel, make sure the tunnel URL is still active. If using a production/staging deployment, use its stable HTTPS URL.

Checkout payment verification is performed by the app's server after Razorpay Checkout returns. The webhook is an additional server-to-server notification path that records captured/failed events and deduplicates deliveries; a local webhook will not work unless the local app is reachable through HTTPS.

## Environment variables

Create `.env.local` in the repository root from `.env.example`. Fill in the values without quotes unless a value contains spaces:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_project_key
NEXT_PUBLIC_AUTH_BYPASS=false
SUPABASE_SERVICE_ROLE_KEY=your_private_supabase_service_role_key
SPACEYAAR_ADMIN_USER_IDS=your-reviewer-supabase-auth-user-uuid
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_private_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

The signed-in owner/renter flow needs the Supabase URL, publishable key, service-role key, and Razorpay Key ID and Key Secret. `RAZORPAY_WEBHOOK_SECRET` is required for the webhook endpoint; configure it for a complete payment integration, although checkout verification also records a successful payment directly. `SPACEYAAR_ADMIN_USER_IDS` is needed to approve the owner's pending listing. `NEXT_PUBLIC_AUTH_BYPASS` is an optional development-only screen-navigation shortcut, not a replacement for a real Supabase session. Optional OAuth and email/SMS provider credentials are configured in Supabase, not in this app's `.env.local`.

`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are private server-side secrets. Never use `NEXT_PUBLIC_` for them. The API only returns the Razorpay Key ID to the checkout browser when creating an order. Confirm `.env.local` is ignored by Git before entering secrets; never share secret values in screenshots, chat, logs, or source control.

Payment amount and eligibility are read server-side from an accepted booking; client-supplied amounts are never used. Online orders must total at least INR 1.00 (100 paise). Subscription events are stored in `razorpay_subscriptions`, while every verified webhook is deduplicated in `razorpay_webhooks`. Creating customer-facing subscriptions/plans is not part of the booking checkout flow.

## Owner and renter happy-flow test

1. Apply every migration above and configure the Supabase URL/publishable key, service-role key, `SPACEYAAR_ADMIN_USER_IDS`, and Razorpay **test** credentials in `.env.local`. Restart the app after environment changes.
2. Create two separate Supabase Auth accounts: one owner and one renter. Email/password is sufficient if email confirmation is configured; if using phone OTP, configure a supported SMS provider and verify both phone numbers. Set local callback URLs as needed.
3. Sign in as the owner, select **I have a space**, finish owner onboarding, and submit a listing with at least one photo and one KYC document. Use a supported rate model (`Per Day`, `Per Week`, or `Per Month`) and select the weekdays that cover the renter's chosen dates.
4. Sign in as an allowlisted reviewer and open **Owner → Dashboard**. For a quick local test, the owner account can also be the allowlisted reviewer; use a separate reviewer account in shared/staging environments. Tap **Host Dashboard** three times quickly, review the pending listing/documents and choose **Approve and publish**.
5. Sign out, sign in as the renter, select **I need a space**, find the published listing, and submit a request for available dates that meet the minimum stay.
6. Sign back in as the owner, open **Renters**, and accept the request.
7. Sign in as the renter, open **My Bookings**, and pay using Razorpay test checkout. Complete the test payment in Checkout and verify that the booking shows paid. Confirm the event in the Razorpay webhook delivery log if you configured a reachable webhook URL.

Each account must use its own browser session. Use a real configured Razorpay test account; the app does not simulate successful payments.

## Production checklist

- Add every required environment variable from the list above to the hosting provider's production environment. Keep Razorpay test credentials in development/staging and set live credentials only in the production environment after merchant activation.
- Add the production and custom domains to Supabase Auth's Site URL/redirect allow list and configure OAuth callback URLs if those providers are enabled.
- Switch Razorpay to **Live Mode** only after merchant activation; generate a separate live API key pair, configure the live webhook URL and a separate live webhook secret, then add those live values only to the production environment. Never reuse test keys in production or live keys locally.
- Configure OAuth credentials, SMS delivery, and production email SMTP in Supabase only for the sign-in methods you plan to offer.
- Review RLS and storage policies in the Supabase dashboard after applying the migration.
- Use Supabase backups and test account deletion/data retention before handling real KYC documents.
