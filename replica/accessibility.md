# Accessibility review — 30 October 2026

The production-facing public site, guest booking flow, agency workspace and platform workspace were reviewed against the [WCAG 2.2 reference](https://www.w3.org/WAI/WCAG22/quickref/). English, French and Arabic/RTL were checked at desktop, mobile and narrow reflow widths.

## Result

119 automated page/language/viewport combinations across 33 route variants; 0 remaining automated findings or horizontal-overflow cases. The JSON evidence is in accessibility-audit.json. Corrected cases retain their earlier findings for traceability. Private receipt/access-denied, cancellation, cookie notice, booking stages and open dialogs are additionally exercised in e2e/accessibility.spec.ts.

## Changes

- Fixed the header partner button hover cascade so its label remains white against emerald.
- Added a visibly focused skip link and focusable main regions; dashboard route changes focus the new heading without remounting the shell.
- Added keyboard tab navigation (Arrow keys/Home/End), roving tab stops and correctly associated panels.
- Replaced custom modal semantics with native modal dialogs, unique accessible titles, background inertness, focus containment, Escape and focus restoration.
- Mobile navigation contains focus, closes on Escape, returns focus to its trigger, and hides the staff content from interaction while open.
- Corrected heading levels, public landmarks, form help associations, visible-label/accessibility-name mismatches and table header scopes.
- Improved autocomplete, busy states, booking-step announcements/focus, and result-count announcements. Native validation remains available.
- Decorative Lucide icons are hidden from assistive technology; meaningful charts retain their labels.
- Added two-tone focus visibility, forced-colors support and retained reduced-motion behavior.
- Removed narrow login and booking overflow, including the French booking badge/title at 320px.

## Regression checks

The accessibility, dashboard navigation and isolated management browser suites pass together (8 tests). They check keyboard interactions, public button hover, dialogs, responsive menus, booking stages, guest private access, invoices and tenant isolation. The source dictionaries and domain calculations are covered by the unit suite.

Run the broad scan with node scripts/audit-accessibility.mjs. Use --recheck to repeat only previously flagged cases. The command returns a failing exit code when findings remain. The keyboard suite is npx playwright test e2e/accessibility.spec.ts; set TEST_MONGODB_URI to the local dev database to include its self-cleaning guest booking fixture.

## Remaining validation

This is an automated and Chromium keyboard review, not a conformance certification. Real screen-reader testing with NVDA/JAWS/VoiceOver and additional browser/OS combinations remains manual validation.

## Contract extension — 30 October 2026

The contract workflow adds full-tag Axe checks for the empty/populated screen, draft form and issued dialog, plus 320px lists in English/French/Arabic. These pass. Native focus containment and persistent dashboard navigation remain covered by the existing browser suites. The contract print sample was also rendered from the generated A4 PDF and visually checked for legible content and complete signature lines. The earlier 119-case report remains the evidence for its recorded routes; the broad audit script now includes Contracts for subsequent full scans.
