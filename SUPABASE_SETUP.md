# Supabase setup

The app uses Supabase for Auth, Postgres, and Storage. The service-role key is not used by the app; browser and server code use only the publishable key and rely on row-level security.

## Create the project

1. Create a Supabase account and a project. Choose a region close to the first users (for SpaceYaar, Mumbai if available).
2. In the project dashboard, open **SQL Editor** and run `supabase/migrations/20261017000000_initial_schema.sql`.
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

The migration creates profile, listing, photo metadata, private KYC metadata, favorites, and booking tables with RLS. It creates a public `listing-photos` bucket and a private `kyc-documents` bucket.

API routes currently cover profile role updates, published listing reads, owner listing drafts and submission, media metadata, favorites, and booking requests/status updates. New owner submissions become `pending_review`; they are intentionally not exposed to renters until reviewed. There is not yet an admin moderation screen, so for the first test, review the listing and change its status in SQL Editor:

```sql
update public.listings
set status = 'published'
where id = 'LISTING_UUID' and status = 'pending_review';
```

Booking requests are implemented; payment processing is not. A payment provider account, verified merchant onboarding, and payment UI/API are still needed before accepting money.

## Production checklist

- Add the two public Supabase environment variables to Vercel after the project is ready.
- Add the production and custom domains to Supabase Auth's redirect allow list.
- Configure OAuth credentials, SMS delivery, and production email SMTP as needed.
- Review RLS and storage policies in the Supabase dashboard after applying the migration.
- Use Supabase backups and test account deletion/data retention before handling real KYC documents.
