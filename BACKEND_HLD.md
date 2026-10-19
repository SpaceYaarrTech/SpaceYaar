# SpaceYaar Backend High-Level Design

**Assessment date:** 19 October 2026
**Scope:** Backend required by the screens and interactions currently present in the repository. This is an implementation inventory and target design, not confirmation that Supabase migrations, provider credentials, or production deployment are configured.

## 1. Executive summary

The application already has a useful backend foundation: Supabase Auth, Postgres and Storage; row-level security for the main data; Next.js route handlers for listings, favorites, bookings and profiles; and Razorpay order, verification and webhook handlers.

**Estimated completion:**

- **About 70% of the first-pass API surface** for the currently visible product flows exists in code.
- **About 55–60% of end-to-end production backend capability** is implemented. Remaining work includes production provider configuration and verification, booking completion/cancellation/refunds, payouts, notifications, analytics, and renter profile capabilities.

These are engineering estimates, not a line-count metric. Core owner listing review → renter discovery/request → owner acceptance → renter checkout is now represented in the application. Runtime verification still depends on applying migrations and configuring Supabase and Razorpay test credentials.

### Highest-priority issues

1. **Environment setup is required for a live happy-path run.** Apply all migrations, configure Supabase Auth/Storage, set the server-side admin allowlist and provide Razorpay test keys.
2. **Payment integration still needs a real test-mode run.** The handlers verify signatures and provider capture, but runtime provider events, webhook delivery and recovery have not been verified here.
3. **Booking lifecycle is intentionally incomplete beyond the current request/accept/decline/cancel-request flow.** Completion, accepted-booking cancellation and refund policy still need product decisions and implementation.
4. **Renter profile, conversations, notifications, analytics, refunds and payouts** are not implemented as end-to-end capabilities.

## 2. Current product screens and their backend needs

| Area / screens | Current data/actions | Backend assessment |
|---|---|---|
| Sign up, login, OTP, OAuth callback | Supabase Auth client handles email, phone OTP, Google/Facebook; auth callback exchanges the code | Mostly delegated to Supabase. Provider setup, SMTP/SMS and callback configuration remain environment/project operations. No custom auth API is needed for the present approach. |
| Role selection | Saves owner/renter choice through `PATCH /api/profile` | Role-only updates are validated separately from owner business-profile updates. |
| Location selection / confirmation | Map/geocoding and browser location state | Client-side; selected location is not a persisted profile preference or server-side search context. |
| Renter home / Find a Space / map / detail | Reads published listings, shows listing facts and photos, can open a booking request | Real listing APIs exist. Search result set is capped; several filters/sorts and map-distance behavior are client-side. |
| Saved Spaces | Favorites and cards are loaded from the favorites API; city and property-type groups are derived in the browser | Save/unsave works; user-created collections do not exist. |
| My Bookings / booking request | Request with dates/message; list status and payment state; accepted-booking contact; Razorpay checkout | Date/minimum-stay/weekday rules and overlap-safe acceptance run in database functions. Completion, accepted-booking cancellation/refunds, and notifications need work. |
| Owner listing onboarding / edit / spaces | Draft listing, upload photos/private KYC docs, attach metadata, submit for review, view/edit owner listings | Core owner listing workflow exists. Rejected listings can be resubmitted. Private document handling and retention need production policy. |
| Internal listing moderation | Hidden three-tap dashboard entry; allowlisted admin sees pending listings and private KYC links, then approves/rejects with reason | Implemented with server-side user-ID allowlist and an audit record; apply the moderation migration and configure `SPACEYAAR_ADMIN_USER_IDS`. |
| Owner dashboard / renters / request detail | Listing and booking summaries; accept/reject requests | Data is present. Dashboard summaries are derived client-side. “In Chat” is empty/unavailable. |
| Owner analytics | Counts listings/bookings; views and payouts display “Not tracked” | No analytics/event or payout backend. |
| Owner profile / business profile / password | Business data and photo; password uses Supabase Auth | Business profile API exists. Payout and notification settings are explicitly unavailable. |
| Renter profile | Placeholder screen | No renter profile settings flow beyond shared profile data. |

## 3. Current architecture and data model

```text
Next.js screens
  ├─ Supabase Auth client ─────────────── Auth, OTP, OAuth, password changes
  ├─ Supabase client + Storage ───────── Owner photo/KYC uploads, profile photo
  └─ Next.js route handlers
       ├─ Supabase SSR client ────────── User-scoped reads/writes under RLS
       ├─ Supabase service role ──────── Payment metadata, webhook, owner contact, allowlisted listing review
       └─ Razorpay SDK / signed webhook ─ Payment order, provider verification

Supabase
  ├─ Auth users
  ├─ Postgres + RLS
  └─ Storage buckets: listing-photos, kyc-documents, profile-photos
```

### Existing tables

- `profiles`: identity reference, display name, phone, role; later migration adds owner business fields and profile photo path.
- `listings`: owner, property/space details, rate, minimum duration, availability weekdays, address/coordinates, review status.
- `listing_photos`, `listing_documents`: storage metadata; KYC files are stored in a private bucket.
- `favorites`: renter/listing unique pair.
- `bookings`: renter, owner, listing, requested dates, message, status and quoted total.
- `razorpay_payments`: order/payment IDs, amount, currency and payment state.
- `razorpay_webhooks`: provider event ID and raw event payload for deduplication/audit.
- `razorpay_subscriptions`: subscription snapshots received through webhooks; no current subscription product flow.
- `listing_moderation_events`: append-only moderation decisions and rejection reasons.

RLS is enabled for the core tables. The service-role key is intended to remain server-side. Some owner workflows upload files directly from the browser under authenticated Storage policies, then call a route to persist metadata.

## 4. Implemented API inventory

The repository currently contains **16 API route files** (plus the Supabase Auth callback route). “Implemented” below means there is handler code; it does not imply provider setup or every product lifecycle is production-complete.

| Route | Methods | Current responsibility | Status / limitations |
|---|---|---|---|
| `/api/profile` | `GET`, `PATCH` | Read profile and update role or owner business fields/profile-photo path | Role-only updates are accepted separately. Renter profile editing/preferences are not covered. |
| `/api/listings` | `GET`, `POST` | Search published listings; create an owner draft | GET supports city, type, min/max price, and a limit up to 50. No cursor pagination, full-text search, geospatial radius, or server-side availability filter. |
| `/api/listings/[id]` | `GET`, `PATCH`, `DELETE` | Read public listing; update eligible owner listing; delete a draft | Public details are published-only. Edit/delete are owner-scoped; deletion only supports drafts. |
| `/api/listings/mine` | `GET` | Owner listings and signed KYC document URLs | Signed URL failures return a null URL; admin document review uses a separate short-lived signed URL. |
| `/api/listings/[id]/assets` | `POST` | Persist photo/document metadata after client upload | Upload itself is direct to Supabase Storage. |
| `/api/listings/[id]/submit` | `POST` | Require at least one photo and KYC document; transition draft/rejected listing to pending review | Moderation is provided through the allowlisted internal admin route. |
| `/api/favorites` | `GET`, `POST`, `DELETE` | Read, save and unsave published listings | Favorites only; collections are browser-derived. |
| `/api/bookings` | `GET`, `POST` | List participant-visible bookings (plus captured payment status when service key is configured); create renter request | Database function validates renter role, future dates, availability weekdays, minimum duration and quote. `Customize` is quote-only and cannot be booked through automatic checkout. |
| `/api/bookings/[id]` | `PATCH` | Accept, reject, or cancel a pending booking request | Database function enforces actor and state rules and locks the listing while checking overlapping accepted bookings. No completion action. |
| `/api/owner/renters` | `GET` | Owner booking requests with renter and listing summary | “In Chat” is not backed by a conversation service. |
| `/api/bookings/[id]/contact` | `GET` | Return owner phone to the renter for an accepted booking | Restricted to the renter on that accepted booking; uses service role to read contact. |
| `/api/payments/razorpay/create-order` | `POST` | Validate renter/accepted booking/amount and create a Razorpay order | Server derives amount from booking and persists the order. Payment idempotency/concurrent order behavior deserves hardening. |
| `/api/payments/razorpay/verify-payment` | `POST` | Verify checkout signature and provider-captured payment; persist captured state | Supports repeat success for the same captured payment. Needs integration tests and operational reconciliation. |
| `/api/payments/razorpay/webhook` | `POST` | Verify webhook signature, update payment/subscription records, store event ID/payload | Subscription data is a snapshot only. No payouts, refunds, or subscription creation. |
| `/api/admin/listings` | `GET` | List pending listings and short-lived signed private-document review URLs | Server-side `SPACEYAAR_ADMIN_USER_IDS` allowlist required. |
| `/api/admin/listings/[id]/review` | `PATCH` | Approve/publish or reject a pending listing and record moderation audit | Only allowlisted signed-in users; rejection requires a reason. |

## 5. Target API and service design

Keep Next.js route handlers as a thin HTTP/auth/validation boundary for now. Use the Supabase SSR client for user-scoped operations so RLS remains effective. Use service-role access only in server-only services for provider webhooks, payment reconciliation, and tightly authorized sensitive reads. Put cross-row business rules (date conflicts, booking transitions, payment reconciliation) into transactional Postgres functions or another atomic server-side unit rather than relying on UI checks.

### A. Account and profile

**Keep:** Supabase Auth client flows for signup/login/OTP/OAuth and password updates.

**Correct / add:**

- Role-only updates are handled by `PATCH /api/profile`; preserve the separation from owner business-profile updates.
- Add `PATCH /api/profile` fields for user-editable identity data only when the renter profile UI is defined.
- Add notification preferences only after channels and consent rules are selected.
- Do not create custom password/session endpoints unless Supabase Auth ceases to own those responsibilities.

### B. Listing discovery and owner listing management

**Keep:** public listing read, owner draft create/edit/delete, file metadata and submission.

**Add or evolve:**

- `GET /api/listings`: cursor pagination and explicit filters for space type, location/radius, rate model, capacity/features, and availability. Define sort and filter semantics centrally.
- `GET /api/listings/[id]/availability?from=...&to=...`: return bookable/unavailable dates after booking rules are implemented.
- Admin-only review routes are implemented at `GET /api/admin/listings` and `PATCH /api/admin/listings/[id]/review`, with an environment allowlist and audit record.
- Optional view/impression event route only if analytics are product requirements; avoid counting client page renders as authoritative views without bot/deduplication rules.

### C. Booking lifecycle and availability

**Keep:** renter request creation, renter/owner lists, accept/reject/cancel endpoints.

**Add or evolve:**

- Booking creation and acceptance use transactional database functions. Both serialize on the listing row; acceptance re-checks overlap against accepted reservations. Configure selected weekdays and date ranges consistently in the renter UI.
- Decide and document date inclusivity, timezone, minimum stay, price model semantics (`Customize` in particular), deposits, cancellation cutoff, and owner overrides.
- Add a single explicit transition contract, such as `PATCH /api/bookings/[id]` with permitted action by actor, source state, destination state, and audit event. Do not accept arbitrary status assignment.
- Add completion/expiry handling (owner/renter confirmation or a scheduled job), and define cancellation/refund rules.
- Add `GET /api/bookings/[id]` if screens need a detail route independent of loading all bookings.

### D. Payments and settlement

**Keep:** server-side order creation, signature/provider verification, signed webhook processing.

**Complete before live money movement:**

- Persist an immutable payment/order ledger and reconcile webhook, verify, duplicate and out-of-order events idempotently.
- Define one canonical booking/payment state machine and update booking payment status from verified events, not browser success alone.
- Add refund API/workflow tied to a validated cancellation policy and provider refund state.
- Add owner payout onboarding, KYC/compliance, transfer/settlement ledger and reconciliation only when the business model and Razorpay product support are confirmed.
- Keep subscriptions separate; remove or defer subscription storage if subscription functionality is not on the product roadmap.

### E. Messaging, notifications, saved collections

These are not implemented today. Add only if required by the product:

- Messaging: `POST /api/conversations` (find/create for a booking), `GET /api/conversations`, `GET/POST /api/conversations/[id]/messages`, read state, membership authorization, abuse/reporting and retention.
- Notifications: persist events/preferences; deliver email/SMS/push via a background worker; provide `GET /api/notifications` and read/acknowledge route. Booking status changes should enqueue notifications after transaction commit.
- Collections: if collections are user-created rather than derived, add `collections` and `collection_items` with renter-scoped CRUD. Current groups need no extra API/table.

### F. Analytics and operational APIs

- Analytics needs event definitions (listing impressions/views, booking conversions, payment outcomes), attribution/privacy limits, deduplication, retention, and aggregate endpoints such as `GET /api/owner/analytics?from=...&to=...`.
- Admin operations need role protection, moderation audit, support tooling, and safe access to private documents.
- Add rate limits/abuse controls for OTP and public search, structured request IDs/logging, error conventions, monitoring/alerts, and backup/retention policies.

## 6. Suggested backend schema additions

Do not create every table preemptively. Add the following only as the corresponding feature is approved:

| Feature | Suggested data additions |
|---|---|
| Booking availability | Booking exclusion/overlap constraint or reservation table; optional listing availability exception/blackout dates. Existing `availability_days` is weekly metadata, not a date calendar. |
| Moderation | `listing_moderation_events` is implemented with actor, decision, reason, and timestamp. |
| Booking audit / notification | `booking_events`; `notifications` and `notification_preferences` if user-visible delivery is in scope. |
| Messaging | `conversations`, `conversation_members`, `messages`, read markers. |
| Collections | `collections`, `collection_items`, uniqueness and owner-scoped RLS. |
| Payments/refunds/payouts | Immutable payment/refund/transfer ledger with provider IDs and idempotency keys; do not store raw bank credentials. |
| Analytics | Minimized, retention-limited event store and aggregate strategy; avoid unnecessary personal data. |

Any migration must include indexes, constraints, RLS, grants, retention/cleanup strategy, and migration application instructions. Existing SQL migrations are the source of truth; confirm all migrations have been applied to each Supabase environment.

## 7. Delivery priorities

### P0 — make current core flow correct

1. Apply the booking and moderation migrations and verify them against the configured Supabase project.
2. Exercise the owner/renter journey with two real Auth accounts and confirm Razorpay test checkout and webhook behavior.
3. Harden payment idempotency/reconciliation before live payments.
4. Add completion, accepted-booking cancellation, refund and expiry rules.

### P1 — complete visible but incomplete screens

1. Renter profile and account preferences.
2. Owner analytics backed by defined events; otherwise keep unavailable metrics clearly labeled.
3. Notifications for booking request, acceptance/rejection, payment and cancellation.
4. Decide whether “Chat Owner” means phone contact only or requires in-app messaging; implement the selected behavior.
5. Decide whether saved groups remain derived or become user-managed collections.

### P2 — commercial operations and scale

1. Refund/cancellation policy and provider integration.
2. Owner payout onboarding and settlement/reconciliation.
3. Search pagination/geospatial indexing and query performance.
4. Moderation/support console, audit exports, retention and production monitoring.

## 8. Readiness summary

| Capability | Assessment |
|---|---|
| Supabase Auth integration | Present; relies on correct external project/provider configuration. |
| Renter listing discovery and saved items | Functional API foundation; search is limited and collections are derived. |
| Owner listing CRUD/uploads/submission | Functional foundation with allowlisted review/approve/reject flow; KYC policy and document retention remain. |
| Booking requests and owner responses | Date availability, overlap-safe acceptance and request transition rules implemented; completion and cancellation/refund rules remain. |
| Razorpay checkout | Core order/verify/webhook handlers present; requires test-account verification and does not include refunds, payouts or reconciliation. |
| Owner/renter profiles | Owner business profile and role selection work; renter profile settings remain incomplete. |
| Messaging/notifications | Not implemented. |
| Analytics | Only simple counts derived from existing data; views/earnings not tracked. |
| Admin operations | Hidden-entry moderation screen and API protected by an admin user-ID allowlist; broader support tools are absent. |
| Production operations/security | RLS and private service-role patterns exist; provider setup, integration tests, observability, retention and recovery still need sign-off. |

**Bottom line:** The code now covers the core owner-to-renter journey through payment, subject to Supabase migrations and Razorpay test credentials being configured. This is not yet a production-complete marketplace: provider verification, refund/payout operations, notifications, messaging, analytics and account lifecycle work remain.
