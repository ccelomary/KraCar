# Atlas Journeys

An independent Morocco travel marketplace with a traveler storefront, agency workspace, and platform administration. Built with **Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and MongoDB**. Atlas Journeys is a provisional product identity, not an affiliation with the reference service.

## Run locally

Requires Node.js 22.13+ and npm.

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. Without `MONGODB_URI`, the development script starts a real local MongoDB process and stores its data in `.data/mongo`. The first run may download the MongoDB binary. Data survives a normal restart. No cloud account is needed.

Visit `/login` and choose **Agency demo** or **Platform demo**. Sample access is restricted to development. The conventional sample credentials are `agency@atlas.local` or `admin@atlas.local`, password `AtlasDemo2026!`. All sample people, agencies, reservation activity, commercial conditions, and prices are fictional.

The development server binds to `127.0.0.1`. Demo workspaces are intended for this local preview. Do not point a demo instance at a production database.

## What works

- Responsive storefront, four service categories, destination search, transmission/fuel/price filters, sorting, empty/error states, and illustrative listing photography.
- English, French, and Arabic across the storefront, booking flows, help/policies, sign-in, and both dashboards. The language switcher remembers your preference and preserves in-progress forms. Arabic uses a mirrored right-to-left layout; dates, prices, exports, and search follow the selected language.
- Three-step car request: dates and pickup → protection → traveler details. Other services use a two-step request. Server-side integer-cent pricing and driver eligibility checks.
- Private guest reservation access, status refresh, request download, and withdrawal of pending requests. The private link is shown after submission and should be saved. Tokens expire after 30 days; the browser cookie expires after seven days.
- Agency dashboard with reservation value charts, category breakdown, scoped reservation review, CSV export, listing creation/editing/archiving, monthly calendar, and profile settings.
- Platform dashboard with cross-agency reporting, agency approval/suspension, manager account creation, listing management, reservation coordination, and a support inbox.
- Partner application → platform review → manager provisioning → password sign-in. Support form → persisted platform inbox → resolved/reopened state. Email reply links open the operator’s mail client.
- Signed HttpOnly staff session cookies, scrypt password hashes, server-side tenant checks, validated mutations, origin checks, database-backed request throttling, unique reservation idempotency keys, and audit records for staff changes.

## Production setup

Create `.env.local` using `.env.example`. Set your own `MONGODB_URI`, database name, `SESSION_SECRET` (at least 32 random characters), `APP_ORIGIN` (the exact public HTTPS origin), `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` (at least 12 characters). Use a separate database from the local sample preview. Set `DEMO_MODE=false`.

```powershell
npm run seed
npm run build
npm start
```

`seed` creates configured staff accounts without adding sample catalog records or overwriting existing credentials. The platform administrator can approve partner applications, create manager access, and add listings. Optional `AGENCY_EMAIL`, `AGENCY_PASSWORD`, and `AGENCY_ID` provision an initial manager for an already approved agency; its agency ID must match the actual agency document.

Use a supported Node hosting service and a MongoDB deployment with TLS, authentication, backups, and least-privilege database access. The host must set the correct public origin and provide trustworthy client IP forwarding for rate limits. Production rejects mutations if `APP_ORIGIN` is missing. Credentials are never placed in client code. Staff sessions expire after 24 hours. Credentials for a newly provisioned manager are handed off manually; the app sends no messages automatically.

## Release boundary

This is a working **request-and-review application**, not a live payment processor or an instantly confirmed inventory marketplace. Approving a request sets `awaiting_payment`. Operators cannot manually mark it paid through the API. Existing confirmed/completed reservations in the local preview are explicitly fictional examples.

Before accepting real commercial bookings, connect a payment provider, verified-payment fulfillment and resource allocation, email delivery and retry jobs, cancellation/refund execution, verified insurance and price conditions, and reviewed operator policies. Add password recovery/MFA, credential rotation, production monitoring, and document verification/storage as required for your operating model. No provider credentials were supplied and no resources or paid services were provisioned. Coupon campaigns are not implemented. Registration documents are stored privately in MongoDB (5 MB maximum); only signed-in platform staff can download them. Review document retention and verification procedures before commercial use. The supplied sample catalog is translated; provider-authored descriptions and traveler messages remain in their original language.

Listings and bookings are initially bounded to 500 reservations per workspace and 200 support messages per request. Larger operational datasets need server pagination and aggregation before scaling.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npx playwright install chromium
# With npm run dev running:
npm run test:e2e
npm audit --omit=dev
```

Browser checks exercise guest requests, private access, cancellations, agency listing edits, reservation review, exports, mobile layouts, role boundaries, onboarding, and support. Axe checks cover the tested screens. Screenshots are in `replica/clone-screens/`; the browser report is generated in `playwright-report/`.

See [implementation notes](replica/build-log.md), [database/security boundary](replica/backend.md), [test plan](replica/test-plan.md), and [media sources](replica/design/media.md). `replica/screens/` contains research screenshots only and is never served as product media. The SQL files are retained as an earlier, superseded architecture proposal; this application uses MongoDB exclusively.

See [language implementation](replica/localization.md) for translation dictionaries, preference behavior, and RTL conventions.

## Public marketplace refresh

The shared storefront now uses an emerald header, compact service navigation, centered photo hero, service tabs, horizontal desktop result cards and mobile filters. `/partners` (also `/list-your-property`) contains the complete business application and registration upload. Platform agency cards expose the application details and private document download before approval.

`/faq`, `/about`, `/blog`, and `/article/:slug` provide original informational content. `/en`, `/fr`, and `/ar` entry routes select the language and redirect to the corresponding internal page; `/fr/list-your-property` and localized category/city/detail links are supported. Drop-off city is carried from search to the reservation form. See [public reference findings](replica/reference-refresh.md) for observations and limits.

## Platform workspace UX

The platform overview leads with linked reservation, partner-review and support queues, followed by the reporting-period metrics. The navigation rail, typography, cards, sticky header and mobile/Arabic layouts have been refined for daily operations. Agency status/sort filters, support status/text filters and catalog category/visibility filters include real counts and resettable empty states. Reservation tables have ten rows per page and URL-backed status filters. Suspending an agency requires a confirmation explaining the effect on access, listings and reservations. Global reservation search no longer changes page-local filters while typing.

See `e2e/platform-ux.spec.ts` for keyboard queue navigation, filter/pagination persistence, empty states, suspension cancellation, support filtering and Arabic mobile accessibility checks.


## Agency management

Agency managers now have Contacts (/agency/contacts), Fleet overview (/agency/vehicles), and Invoices (/agency/invoices). Contacts can be created manually or prefilled from a reservation, edited and archived; history matches reservation email. The physical fleet register tracks plates, mileage, manual operating status, linked model listings, insurance and service reminders. Fleet records do not automatically allocate cars or change public listing availability.

Invoices support a per-invoice MAD/EUR choice, optional reservation linkage, line items, draft editing, sequential numbering on issue, partial/full payments, unpaid voids, and browser print/save as PDF. Totals use integer cents and balances remain separated by currency. Issued customer/issuer/price snapshots are immutable; payment entries record funds already received and do not charge cards or change reservation status. No automatic tax calculation is applied. Configure business billing address and tax identifier in agency Settings before creating invoices.

All management records are scoped to the signed-in active agency. Record versions prevent stale writes and duplicate payment submissions. No management data is exposed through the public catalog.

Run the isolated management browser test against the same local database as the dev server: set TEST_MONGODB_URI (and TEST_MONGODB_DB if changed), then run npx playwright test e2e/management.spec.ts. The test creates two temporary agencies and removes only its own fixtures in a finally block.

## Accessibility

See replica/accessibility.md for the app-wide accessibility review and replica/accessibility-audit.json for route/language/viewport evidence. Run node scripts/audit-accessibility.mjs for the broad Axe/reflow scan; --recheck repeats flagged cases. Keyboard/dialog/guest tests live in e2e/accessibility.spec.ts. The guest fixture requires the same local TEST_MONGODB_URI used by the management suite and cleans up its own booking.

## Rental contracts

Open Contracts in the agency sidebar. Create an active contact and a physical vehicle first; then prepare a draft with the driver/licence, pickup and return details, selected EUR/MAD currency, daily rate, separate refundable deposit, mileage, fuel, condition and your agency rental terms. An optional car reservation can prefill details, and an invoice can be linked when its customer and currency match.

Issuing assigns a CTR-year-number reference and locks the agreed snapshots. Print or save the document for paper signatures; there is no electronic-signature service. Record the actual return date, mileage, fuel and condition separately, or void a draft/issued contract with confirmation. Returning or voiding a contract does not automatically update vehicle availability, a reservation, an invoice, or payments. Access is restricted to the owning active agency, with record versions protecting against stale or duplicate updates.

Run the self-cleaning contract flow with TEST_MONGODB_URI set to the dev database and npx playwright test e2e/contracts.spec.ts. An optional CONTRACT_PDF_PATH writes a print-verification PDF.

## Car photos

Fleet overview → Add vehicle / Manage vehicle now accepts up to six JPEG, PNG or WebP photos (5 MB each), with previews, cover selection, removal and optional descriptions. The cover appears on the physical vehicle card. These fleet photos remain private to the agency and platform staff.

My listings → Add a listing / Edit listing offers the same controls for car rentals. Published listing photos appear on search cards and in the rental detail gallery. Archiving the listing removes public access to its uploaded photos unless another published listing references them. Linking a physical vehicle to a listing does not automatically publish its photos.

Uploads are validated and re-encoded as bounded WebP images with source metadata removed, then stored in MongoDB. An uploaded photo can only be attached to its owning agency's records; unattached uploads expire after 24 hours. Controls and feedback support English, French and Arabic, keyboard navigation and mobile layouts. Run `npx playwright test e2e/car-photos.spec.ts` with `TEST_MONGODB_URI` pointing to the local test database for the self-cleaning upload/privacy/gallery workflow.
