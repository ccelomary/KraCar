# KraCar implementation

The supplied product prompt is the requirements source. The named Vestracar reference and KraCar logo were not present in the attachments or repository. No reference behavior is represented as verified; no reference data or API is used.

## Architecture decisions

Preserve Next.js App Router, TypeScript, Tailwind, existing accessible controls and persistent staff layouts. The rental core uses MongoDB/Prisma 6 with transaction-protected inventory intervals. Existing MongoDB agency/contact/vehicle/document records remain intact during the transition; never relabel existing EUR financial records as MAD or silently copy production data into development. New rental core amounts are MAD minor units. Better Auth owns new customer sessions; existing staff access remains available while membership permissions are introduced.

Rental periods use UTC instants and are displayed in Africa/Casablanca. Inventory intervals are half-open [pickup, return); adjacent rentals are allowed. Approved and in-progress bookings, direct rentals and manual blocks reserve physical vehicles. Requested bookings do not reserve a car. Default billable duration is each started 24-hour period; no implicit grace period. Pricing and policy are snapshotted at acceptance. Refundable deposits never enter rental revenue.

Live Payzone/CashPlus, real bank payouts and real email require credentials and confirmed documentation. Local payment simulation and notification previews must be explicitly labelled. No public deployment is authorized.

## Checklist

Status meanings: working = executed and verified; implemented = awaiting verification; simulated = local adapter; blocked = named external dependency; pending = remaining implementation.

| Module | Status | Evidence / remaining work |
| --- | --- | --- |
| Existing agency contacts, vehicles/photos, invoices/contracts | working | Previous build, 22 unit checks, 10 browser journeys |
| KraCar navy/teal brand and French default | pending | Preserve translations and accessible navigation |
| MongoDB schema, indexes and Prisma | implemented | Replica set required; setup with `npm run db:push`; SQL migrations are historical only |
| Maintained customer authentication and recovery | pending | Better Auth; local recovery preview |
| Agency members and permissions | pending | Server-side enforcement |
| Vehicle catalogue, search, comparison, reviews | pending | MAD, photography and approved providers |
| Server quote engine, pricing/fee boundaries | pending | Shared immutable snapshots |
| Booking transitions and atomic inventory | pending | Concurrent approval verification |
| Direct rentals, blocks and calendar | pending | Shared physical inventory |
| Contract versions, signatures, condition reports/PDF | pending | Arabic fonts/RTL and immutable signed snapshots |
| Quotations, invoices, credit notes, allocations/receipts | pending | Separate obligations/number sequences |
| Payments/refunds/deposits and reconciliation | pending | Provider-verified vs manual records |
| B2B requests | pending | Supplying inventory and protected client data |
| Balanced ledger/wallet/payout records | pending | Idempotent events; execution disabled |
| Notifications and local email preview | pending | Failures isolated from transactions |
| Full seed/sample documents, browser and security verification | pending | Local fictional data only |

## External dependencies

- Missing functional-reference document and supplied logo; use original KraCar wordmark and explicit product assumptions.
- Live payment providers, email delivery and bank settlement remain disabled without authorized credentials and verified provider setup.
