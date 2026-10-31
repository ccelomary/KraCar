# MarHire public UX refresh — 2026-10-21

The user requested a closer functional and visual match to https://marhire.com/ and supplied a screenshot of the public partner application. This pass extends the existing recon rather than treating previous research as missing.

## Evidence

- Homepage: https://marhire.com/en — desktop screenshot `screens/home-refresh.png`, observed after rejecting optional cookies. Compact promotion/navigation bars, centered photo hero, four service tabs, pickup/drop-off/date search, benefit cards, destinations, service inventory, FAQ and footer patterns.
- Partner page: https://marhire.com/en/list-your-property — desktop screenshot `screens/partner-refresh.png`, supplied screenshot and public rendered form text. Centered introduction; benefits; four service categories; four onboarding stages; centered two-column application; contact callout.
- REA CLI `capture-browser-scenario` launched an owned Chromium profile, navigated to the public partner page and waited 1.8 seconds. Its final accessibility capture is retained in `evidence/partner-rea.json`: `ev_a20b0b414869a01b990f7a76e576705d62af4261a1cd3cf95e7d411674bf7aea`. No source/script captures or private endpoint inspection were requested. The cookie overlay is part of this initial capture; subsequent screenshot observation rejected optional cookies.
- Existing `recon.md` records the earlier public car results, three-stage car wizard, two-stage service forms, support and policy evidence. This pass did not submit any form or payment to the reference.

Observed public interface is evidence of UI structure, not proof of private backend behavior. Agency/platform dashboards are independent product additions: no private reference dashboard or staff account was available. Reference terms and the clean-room boundary remain documented in `recon.md`.

## Implementation

Shared layout uses an independent emerald palette and original Atlas identity. Native navigation disclosures, semantic links, sticky header, Arabic RTL, service search, desktop horizontal result cards, responsive catalog filters, support launcher and back-to-top control. No expired coupon or unsupported reputation claim is reproduced.

Full partner application stores owner, normalized email, international phone/WhatsApp, service category, city, registration number, capacity, description, two declarations and document metadata. File data is in a separate MongoDB collection. Request bytes are bounded before multipart parsing; accepted PDF/JPEG/PNG types must match file signatures and are limited to 5 MB. A unique agency email index prevents racing duplicate submissions. Files are attachments with private/no-store headers and are accessible only to current platform staff; agency and anonymous access are denied. Platform reviewers can inspect details, download the document, approve the agency and provision its manager.

Original About, grouped FAQs, travel-guide index and three articles fill informational page templates. EN/FR/AR-prefixed entry routes preserve the current host, set the language cookie and redirect to internal equivalents. Search drop-off city survives catalog selection and initializes the request.

## Limits

This is an independently implemented request-and-review product, not recovered MarHire source code or private data. Production payments, inventory allocation, automatic email and refunds still require configured services. Sample inventory, commercial policy review, multi-photo galleries, advanced vehicle taxonomy filters, time/package-specific service quotes and promotional campaigns remain distinct gaps in `features.csv`; the UI refresh does not imply complete feature parity or production readiness.
