# MongoDB implementation boundary

The user's Next.js / Tailwind / MongoDB choice supersedes the earlier PostgreSQL proposal. No Supabase, Drizzle, Postgres, or Stripe SDK is used by the application.

## Implemented

- MongoDB driver connection pooling. Development starts a persistent WiredTiger MongoDB process; production requires an explicit URI.
- Collections: `agencies`, `partner_documents`, `listings`, `bookings`, `users`, `tickets`, `audit`, `limits`. Unique IDs and user/agency emails, unique sparse request-idempotency key, agency/start index, TTL cleanup of throttling buckets.
- Partner multipart requests are bounded before parsing. Registration documents accept PDF/JPEG/PNG signatures matching declared MIME, at most 5 MB. Binary data is separate from agency metadata. Anonymous/agency document access returns 403; current platform staff receive a private/no-store attachment. Duplicate agency emails are protected by a unique index and rejected with 409. Application details and two timestamped declarations persist for review.
- Zod validation for staff/public mutations. Prices computed server-side in EUR cents; client totals ignored. Calendar-date car duration, explicit cover/seat charges, guest limits, driver birthday and licence-anniversary checks.
- Guest requests have immutable accepted request details and price at submission, policy/consent timestamps, a hashed capability token, and a 30-day token expiry. The URL fragment is removed on access; its token is exchanged for an HttpOnly cookie. The response includes a private link for saving. No booking-reference-only access.
- Staff password hashes use salted scrypt. HMAC-signed sessions expire after 24 hours. Every workspace query and mutation derives agency ownership from the verified server session. Suspended agencies immediately lose API access and public listing visibility. Staff existence and role are rechecked on each workspace request.
- Origin checks use a configured exact public origin in production. Development compares the incoming Host header to the browser origin to account for Next.js URL normalization. Database-backed rate limiting covers login, guest requests/access, support, and applications.
- Allowed reservation status changes are conditional updates. Requests may be approved for availability or declined; no staff endpoint can turn unpaid requests into confirmed bookings. Unique idempotency keys prevent duplicate requests; matching retries can recover the same private access token without another reservation.
- Platform staff can review agencies, provision agency managers, coordinate reservations, and process the internal support inbox. Staff changes append an audit record without passwords or complete request payloads.
- Demo access and automatic sample seeding are disabled in production. Secrets stay in server modules and environment variables. `.env.example` contains placeholders only.

## External services and launch work

Not connected: payment collection, inventory reservation/locking, verified-payment fulfillment, transactional email, background retry/outbox jobs, refunds, agency payouts, document verification/retention automation, live insurance agreements, account recovery, MFA, and operational monitoring. There is no payment or refund UI that pretends these are available. A request approval alone does not reserve a concrete car.

Guest access currently supports the original saved private link and its browser cookie. Automated email recovery is intentionally absent until a sender is configured. Password recovery and changing existing staff credentials require a further operational flow; provisioning refuses to overwrite existing emails.

Before production: configure MongoDB access restrictions/TLS/backups; verify host forwarding and `APP_ORIGIN`; use separate production data; review commercial policies and licensed inventory; establish retention/deletion procedures; configure monitoring and the financial fulfillment boundary.

## Dependency review

The production dependency audit is run separately from development tooling. The current ESLint Next config dependency chain has an upstream `braces` stack-exhaustion advisory with no compatible patched version in the registry at implementation time. It is development-only; do not downgrade Next.js merely to suppress that report. Recheck toolchain updates before CI deployment. Exact installed package versions and integrity hashes are recorded in `package-lock.json`.
