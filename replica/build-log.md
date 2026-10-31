# Build log — 21 October 2026

## Platform UI/UX improvements

Refined the platform workspace with a dark emerald navigation rail, sticky top bar, stronger typography and spacing, calmer reporting cards, and a three-part operational queue for reservation requests, pending agencies and open support messages. Queue counts cover all dates while reporting retains its period selector. Neutral metric indicators replace decorative upward arrows.

Agency review now has status counts, review-first/name sorting, searchable business/email/city details and resettable empty views. Catalog visibility/category filters and support status/text filters return accurate counts. Global reservation search is independent of local filter text. Reservations use ten-row pagination and instantly save status changes through Next.js-integrated native history, preserving the filter on reload without a server round trip. Suspending an agency requires a focus-trapped impact confirmation; cancel preserves the active state.

Added 44 French/Arabic messages. Mobile layouts, RTL pagination/directional controls, stable navigation labels, notification counts, sidebar focus contrast and loading/empty/error states were reviewed. The development indicator is hidden to avoid overlaying preview controls.

Verification: all **15 browser scenarios verified**, including the three new platform UX cases. Thirteen passed the final broad run; the metadata-timing and exhausted shared-login-throttle cases passed their targeted rerun after test synchronization/client-isolation repairs. One earlier guest run hit Chromium `ERR_NETWORK_CHANGED`; its retry passed with browser error checks preserved. Final lint, TypeScript, 13 unit tests and production build pass. The contrast report contains 21 checked pairs with zero AA failures. Synthetic QA data was backed up and removed from the verified local sample database; original sample request states were restored.

Final reviewed previews: `clone-screens/platform-refresh-overview.png`, `platform-refresh-agencies.png`, `platform-refresh-mobile.png`, and `platform-refresh-ar-mobile.png`. The updated design behavior is documented in `design/components.md` and covered by `e2e/platform-ux.spec.ts`.

## Public marketplace and partner refresh

Inspected the public reference again with REA accessibility evidence and desktop screenshots (`reference-refresh.md`). Reworked the shared storefront into a sticky emerald navigation/announcement shell, centered photo hero, service tabs, expanded discovery and horizontal desktop results. Drop-off city now travels from search through the result into the request. Added original About, grouped FAQ, blog and three guide articles, plus language-prefixed entry links.

S13 now includes every observed business field, two declarations and a private RC upload. Actual multipart bytes are bounded; file signatures/MIME and the 5 MB limit are validated. The platform can inspect all details and download the document; signed-out and agency access are denied. Agency approval and manager provisioning continue to work. Added 127 French/Arabic messages and preserved entered fields/files while switching language.

Final verification for this refresh: **13 unit tests and all 12 browser flows pass**. Lint, TypeScript and production build pass. The updated token report has 17 pairs and zero AA failures. Browser checks include public-guide/FAQ accessibility, Arabic partner entry, French mid-application switching, private document access, forged/oversized upload rejection, drop-off handoff and all existing traveler/agency/platform regressions. QA records are backed up under ignored `.data/` and removed by exact synthetic predicates against the verified local sample database. Screenshots are `clone-screens/marketplace-*`; reference captures remain separate under `screens/`.

This is a closer independently implemented public UX, with the remaining feature/production gaps explicitly retained in `features.csv` and `reference-refresh.md`.

## Language update — French and Arabic

Added English/French/Arabic selection to the storefront, sign-in screen, and both dashboards. Matching French and Arabic dictionaries cover navigation, forms, statuses, errors, sample catalog/protection details, help, policy content, exports, and downloads. The initial server-rendered language and metadata follow the saved functional cookie or weighted browser preferences. Arabic uses RTL layouts and Arabic-capable typography; prices/dates/search follow the locale. Canonical API values, references, city IDs, and monetary units are preserved, and personal names/messages are not implicitly translated.

Language switching preserves search/booking state and private guest access. Added localized-copy/placeholder coverage and locale/search unit cases, plus browser checks for first-render selection, persistence, mid-flow switching, French agency edits, and Arabic desktop/mobile navigation/accessibility. Validation: **11 unit cases and all 9 browser flows pass**, with lint, type checking, and production build passing. Screenshots include `home-fr.png`, `agency-fr.png`, `platform-ar.png`, and `platform-ar-mobile.png`. See `localization.md` for implementation details. The earlier counts below describe the original build snapshot; localization is now implemented in the feature matrix.

Built an original, locally runnable Next.js / Tailwind / MongoDB version from the research-only workspace. The user explicitly requested agency and platform dashboards; both are implemented, alongside the traveler request loop. Atlas Journeys is a provisional independent identity.

## Implemented screen coverage

| Screen | Status | Result and remaining parity |
| --- | --- | --- |
| S01 Home | Done for local version | Responsive hero, service/date/city search, catalog cards, destination links, local-partner entry, footer, essential-cookie notice |
| S02 Results | Partial | Category/city/name/fuel/transmission/max-price filters, sort/reset/count; no brand/class/min-price filters or server pagination |
| S03 Detail/trip | Partial | Photo, specifications, conditions, dates, pickup, return city, child seats; no multi-image gallery or hourly handover controls |
| S04 Protection | Done for local version | Four explicit sample cover options, separate deposit/excess, server age/licence checks |
| S05 Traveler | Partial | Name/email/phone, driver eligibility, notes/consent; no residence or invoice expansion |
| S06 Category | Done for local version | Shared category catalog and service-specific request routing |
| S07 Driver | Partial | Two-step driver request with guests/pickup; no structured intercity/luggage/time configurator |
| S08 Boat | Partial | Boat catalog/detail and private guest request; no operator packages/time chooser |
| S09 Activity | Partial | Per-person quote and guest capacity; no package/difficulty/time preference controls |
| S10 Destination | Partial | City-scoped discovery; no dedicated city editorial page |
| S11 Support | Done for local version | Validated public message persistence and platform support inbox; no invented contact numbers |
| S12 FAQ | Done for local version | Dedicated grouped FAQ with original answers; homepage preview and support route |
| S13 Partner | Done for local version | Full application and private RC upload → platform details/document review → approval → manager provisioning → password access |
| S14 Policies | Partial | Original development terms/privacy/cancellation; operator review and binding insurance agreements remain |
| S15 Blog index | Done for local version | Original translated travel guides and responsive article cards |
| S16 Article | Done for local version | Three original guides, localized metadata, related service links and unknown-slug 404 |
| S17 Payment | Not connected | No card collection, processor, refunds, verified paid confirmation, or payout simulation |
| S18 Receipt | Partial | Request reference/private access/download; not a confirmed travel voucher |
| S19 Management | Partial | Private access, status refresh, request withdrawal, support route; no automated email recovery or self-service repricing |
| A20 Agency workspace | Done for local version | Metrics, chart/category breakdown, scoped reservation actions/CSV export, listing CRUD/archive, calendar, settings, responsive drawer/cards |
| A21 Platform workspace | Done for local version | Platform reporting, agency approval/suspension, manager access provisioning, listing/reservation management, support inbox, settings/calendar |

Research inventory: **5 of 19 templates complete for the local request/review scope; 11 partial; 3 absent/integration-dependent.** Both additional requested dashboards are implemented. The broader feature matrix intentionally remains honest: **14 of 32 must-have rows yes, 15 partial, 3 no**. These counts measure the original research scope, not a claim that the production marketplace has launched.

## Verification evidence

- `npm run build`: successful production compilation, TypeScript, route collection, and prerendering.
- `npm run lint`: no errors or warnings.
- `npm run typecheck`: passes.
- `npm test`: six domain cases pass, including integer-cent totals, separate deposits, date boundaries, capacity, age/licence anniversaries, and state transitions.
- `npm run test:e2e`: all six flows pass. Guest request/private refresh/cancellation; agency listing creation/edit/archive and reservation review/export/calendar/settings; platform approval/support/mobile navigation; partner-to-manager sign-in and support resolution; tenant/role/origin/guest-token boundaries; responsive storefront/booking.
- Axe scans in browser tests and supplemental login/design scans: no reported WCAG A/AA violations on tested states. The token report has **17 pairs and zero AA failures**.
- `npm audit --omit=dev`: zero production dependency vulnerabilities. The development-only ESLint dependency advisory is recorded in `backend.md`.
- Desktop screenshots at 1440px; mobile at 390px. Mobile document-width assertions pass. Screenshots in `clone-screens/` were inspected; mobile reservations use readable tappable cards rather than a clipped wide table.
- Browser exception/unexpected-console/5xx checks are enabled. Reproduced failures and regression repairs are recorded in `bugs.md`.
- Test-created businesses, staff, listings, reservations, and tickets were removed using exact synthetic-name/email predicates against the verified local sample MongoDB instance. The original sample workspace was restored for review.

## Operational next steps

The app runs locally at `http://127.0.0.1:3000`; `/login` exposes local-only agency/platform demos. `npm run dev` starts the database when no URI is provided. Use `.env.example` and `README.md` for configured production staff access.

Real launch still requires payment and email credentials/provider selection, resource allocation and financial reconciliation, operational policies/insurance/inventory, production credentials/backups/monitoring, and account recovery. No paid service was provisioned, no external message was sent, and no deployment was performed. The old SQL proposal is archived and is not used by the runtime.


## 2026-10-30 — Car rental focus

S01/S02/S06/S12 and shared navigation: car rentals remain the default; Things to do retained. Removed private-driver and boat discovery, marketing, partner options and new listing creation. Public catalog/detail and reservation queries exclude retired categories; historical staff records remain intact. Updated English/French/Arabic copy and repointed editorial guides toward cars/activities. Two partner cards fill the desktop grid.

Validation: TypeScript passes. Desktop screenshot visually reviewed; two service tabs, activity search and public catalog checks pass. Further mobile and final lint results recorded below. Screenshots: clone-screens/car-rentals-desktop.png and clone-screens/car-rentals-mobile.png.
Final validation: lint and TypeScript pass. Browser checks confirm activity search, filtered public catalog, retired detail not-found pages, legacy search fallback, two partner service cards, mobile navigation and no horizontal overflow. Desktop and mobile screenshots visually inspected.


## 2026-10-30 — Agency management

A20 extended: Contacts; physical Fleet overview; Invoices; daily-operations summary. MongoDB collections contacts/vehicles/invoices with active-agency authorization and optimistic record versions. Unique per-agency plates and numbered invoices. Server-calculated integer totals; independent MAD/EUR balances; immutable issued snapshots; manual partial/full payments and unpaid voids. Agency Settings adds billing address/tax identifier. Existing model listings and reservation state remain separate from manual fleet status and recorded payments. English/French/Arabic UI.

Explicit limits: no tax engine, payment collection, automatic email, physical vehicle allocation, repair work orders or accounting export. Existing reservation history is matched to contact email and follows the workspace retrieval limit.

Verification: production build successful; lint passes; 17 unit/domain/localization checks pass. Isolated Playwright management flow passes with two temporary agencies: contact/fleet persistence; EUR draft/issue/partial/full payment; MAD issue/void; totals ignoring client overrides; overpayment and zero-total rejection; immutable invoice snapshots; unique plates; tenant isolation; concurrent payment version conflict. Three mobile list screens have no horizontal overflow and zero reported Axe WCAG A/AA violations. Desktop/mobile/print screenshots saved in clone-screens/management-*.png and visually reviewed. Temporary records removed in test teardown.


## 2026-10-30 — Smooth dashboard navigation

Agency/platform dashboards now live in persistent authenticated layouts. Section routing updates the content and controls without remounting the navigation shell. Loaded workspace/management records remain visible during background revalidation and refresh failures; retry errors appear inline. A 30-second request deduplication window avoids repeated reads during section changes; writes still explicitly refresh their scoped records. Section/query changes reset local filters and close mobile navigation. Reporting timestamps update when fresh data arrives. Authentication boundaries retain their cache reset.

Production build passes. Navigation browser tests verify the exact sidebar DOM survives section changes; no document navigations, repeated data reads or skeleton flashes; independent management filters and mobile menu closure.


## 2026-10-30 — App-wide accessibility

Public site, guest booking and both staff workspaces: fixed partner-button hover contrast, skip navigation, native dialogs and focus restoration, mobile menu focus/inertness, keyboard tabs, headings/landmarks, label/name mismatches, help associations, busy/status announcements, decorative icons and narrow-screen reflow. 119 route/language/viewport audit cases across 33 variants have zero remaining automated findings. Keyboard and management regressions pass together (8 tests); temporary guest and management fixtures are removed by teardown. See accessibility.md and accessibility-audit.json. Manual assistive-technology/browser coverage remains outstanding; no blanket conformance claim.


## 2026-10-30 — Rental contracts

Agency Contracts added to the persistent sidebar and daily-operations/customer-history entry points. The agency-only /api/contracts service validates contacts/vehicles and optional reservation/invoice ownership; invoice customer/currency compatibility is checked again before issue. Draft saves capture customer, issuer and vehicle snapshots. Issuing assigns a CTR-year reference and locks the agreed dates, prices, deposit, driver, condition and agency-supplied terms. Return records append actual date/mileage/fuel/condition; returned and void documents cannot be revived. Physical fleet availability, reservation status, invoices and payment ledgers remain separate.

English/French/Arabic content; accessible native dialogs and result announcements; 320px reflow and unchanged persistent navigation. The print layout was repaired to allow complete multi-page documents rather than clipping at the modal viewport. The A4 sample was generated through Chromium with PDF tagging, extracted and rendered through Poppler, and visually verified with both signature lines and the contract reference present. A compact sample fits one readable A4 page. Evidence: clone-screens/contracts-print-verified.png plus issued-desktop and language-mobile captures. Intermediate verification PDFs were removed.

Verification: production build and lint pass; 19 unit/domain/localization tests pass. All 9 distinct browser workflows pass, including the contract lifecycle, ownership isolation, immutable snapshots, EUR/MAD calculations, return validation, concurrent issue conflict, signature print bounds, responsive translations, existing management/invoicing, accessibility and smooth dashboard navigation. The management test now waits for the invoice issue response before asserting the rendered reference. Unavailable contract data was checked separately and shows retry feedback without false zero totals. Temporary agencies, customers, cars, invoices, contracts and counters are removed by test teardown.

## 2026-10-31 — Car photos

Added six-photo uploads to the physical vehicle editor and car listing editor, with native labelled file selection, visible upload feedback, cover selection, removal and description inputs. Fleet cards display the cover. Published rental listings display the selected cover and an accessible thumbnail gallery; private fleet photos do not publish automatically. Activity listings remain available.

Media is stored in MongoDB, scoped to the owning active agency and readable by platform staff. Public access requires a published listing from that active agency. Saving photo references verifies ownership and uses canonical stored dimensions/URLs. JPEG/PNG/WebP files are bounded to 5 MB, signature-checked, decoded and re-encoded as WebP at up to 1600×1200 with source metadata removed. Unattached uploads expire after 24 hours. English/French/Arabic messages and persistent dashboard navigation are retained.

Verification: production build, TypeScript and lint pass; all 22 unit tests pass. The combined ten browser workflows pass, including existing contracts, invoicing, keyboard accessibility and navigation. The final photo workflow also passes after adding explicit image-load waits, public gallery capture and a 320px form accessibility/reflow check. It verifies persisted uploads, cover order/descriptions/removal, private and cross-agency access, cross-agency attachment rejection, unsupported/oversized files, platform access and public access revocation after archiving. Screenshots: car-photos-form.png, car-photos-form-mobile.png, car-photos-fleet-mobile.png and car-photos-public-gallery.png. Fixtures are self-cleaning; records left by an interrupted local test were removed by their exact generated agency IDs. Tests used the local database, separate from the configured remote database.
