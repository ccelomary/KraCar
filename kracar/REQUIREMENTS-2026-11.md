# Platform requirements — 2 November 2026

Source: the user's supplied French specification. This work extends the existing local checkout; it does not deploy it or replace prior data.

## Implemented

- Public positioning as an intermediary for car rental and tourism professionals, with links to both service catalogues. New editorial storefront, warm ivory / forest green / terracotta palette, local destination photography, responsive search, destination links, and Arabic typography.
- Marketplace pricing: partner TTC price after options and discounts; 10% service advance; 5% TTC platform fee added to the client price; both due to confirm; 90% partner balance. Caution remains separate. Amounts round to the nearest minor currency unit. Direct/B2B rentals do not acquire marketplace fees. Existing stored quotes are not recalculated.
- Car and activity request screens display the pricing breakdown. Activity prices keep their original currency; existing EUR amounts are never silently relabelled MAD. New rental core amounts remain MAD.
- Client terminology in the existing management screens, retaining existing contact IDs, collections, API keys and URLs. Added client type, country, ICE and invoice recipient fields. Rental requests distinguish client, driver and invoice recipient.
- Partner contractual conditions tab with structured car and activity fields; submitted conditions require administrative review. Changing conditions moves published vehicles back to draft. Editing only business details preserves the condition approval. Publication and new marketplace requests require approved conditions.
- The rental request captures the exact conditions, platform version, client identity and acceptance time. Changed terms or prices require the client to refresh and accept again. Contract preparation uses the booking's accepted clauses and structured fields. Subsequent profile changes do not rewrite accepted snapshots.
- Stable client idempotency keys for repeated rental request submissions. Existing transaction locks, database uniqueness, inventory exclusion constraints and tenant checks retained.
- Rental invoice preparation snapshots the actual issuer's billing identity; agency service and platform commission documents remain separate. Legal-name, address, ICE, IF, professional tax and fiscal-regime validation before issue. Separate HT, VAT and TTC amounts; tax extracted from TTC, with rates configured per vehicle rather than a global rate. Added line items, dates, client ICE/driver/billing recipient, payment references and contract reference. Existing print/save-as-PDF document mechanism retained.
- Separate account and booking consent explanations; account consent recorded with a dated policy version. No marketing subscription is created. Partner declarations record their policy version. Separate partnership and reservation policy pages.
- Marketplace rentals cannot enter service without provider-verified funds covering the advance and service fee. Manual and simulated receipts do not satisfy this check.

## Verification

- 30 unit tests pass, including pricing, options, discounts, TTC extraction, rounding, direct/B2B boundaries, terms identifiers and translation completeness.
- TypeScript and production build pass (see output/requirements-*.log; rerun after later edits).
- HTTP checks: homepage, account, partnership policy and referenced hero/destination images return 200.
- The configured PostgreSQL endpoint currently refuses the connection (ECONNREFUSED); Docker is also stopped. The rental catalogue therefore returns its explicit unavailable state. Authenticated booking, invoice and condition-review integration has not been exercised in this session.
- Browser visual QA could not be completed: the browser access host is unavailable and native Computer Use stopped because it could not reliably determine the browser URL.

## Remaining dependencies and scope limits

- Live Payzone/CashPlus payment callbacks, real collections/refunds, split settlement, payout timing and automatic payment-to-contract confirmation still require a configured provider and agreed commercial policies. No simulated payment is represented as real.
- No external ERP system was identified. Existing reservations are written into their respective partner-scoped management databases; connecting another ERP requires its API and access. The existing MongoDB activity workflow remains request/review based, separate from the PostgreSQL car core.
- This is not a completed migration of legacy MongoDB invoicing into the new rental finance module. Legacy issued documents and currencies remain intact. Client terminology and settlement breakdowns are updated without duplicating those records.
- Account email verification/delivery, expanded partner onboarding statuses and complete tax-status exemptions remain follow-up implementation. Current profile requirements are conservative; specialist tax exceptions have not been inferred.
- The final issuer tax profile, partnership mandate, cancellation/refund rules and contractual documents need the accountant/legal validation requested in the source specification. No legal compliance certification is claimed.

Tax reference inspected: [CGI 2026, official Ministry of Finance publication](https://www.finances.gov.ma/Publication/dgi/2025/CGI-2026-FR.pdf). Invoice structure follows the supplied article 145 brief; tax treatment remains configurable and subject to professional review.

## UX follow-up — 3 November 2026

The primary public actions are now explicit: Rent a car, Find an activity, and My bookings. The homepage asks for the service, city and dates; invalid return dates are explained before navigation. Offer cards explain the 5% fee and link to price and conditions. Catalogue failures provide retry/help and empty results can reset filters without losing dates.

Car requests now use three steps: dates/options, traveller details, review/send. Sign-in happens before personal data entry and preserves dates/options. Previously entered details survive moving backward within the form. Optional driver and billing fields appear when requested. The final action sends a request, with explicit no-charge and partner-review wording. The success screen provides the reference and tracking action. Mobile users can jump straight to the request; the request panel precedes long conditions and floating help controls are hidden to avoid obstructing it.

Customer account overviews now show requests and document/payment shortcuts, with useful empty states. Business finance metrics and agency registration prompts no longer occupy that customer overview. Request cards explain their next step; staff transition buttons use verbs. Session errors offer retry without prompting an already signed-in user to log in again. Booking support links carry the reference into the support message. French and Arabic messages are included.

Verification: 30 unit tests and nine Playwright journey scenarios pass using controlled API responses, including request submission, sign-in return, edit preservation, account failure recovery, keyboard service selection, support context and mobile English/French/Arabic layouts. Targeted Axe checks found no serious or critical issues in the booking panel. Targeted ESLint passes. Production compilation and TypeScript pass. These browser fixtures do not verify live payments or the unavailable PostgreSQL service.
