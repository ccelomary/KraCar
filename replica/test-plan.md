# Test plan

Local application only; no automated tests target the reference service.

| Case | Story / expected result | Automation |
| --- | --- | --- |
| F01-H1 | Home search → catalog; filters exclude unsuitable cars; reset restores results | Playwright |
| F02-H1 | Car dates/pickup → explicit protection → traveler → request; server total shown | Playwright |
| F02-E1 | Date order, unsupported cover, duration >90 days, passenger limit | Node domain tests; API validation |
| F02-E2 | Exact birthday and licence anniversary evaluated on pickup date | Node domain tests |
| F02-E3 | Private token exchange survives React Strict Mode and refresh | Playwright |
| F02-H2 | Guest cancels a pending request using capability access | Playwright |
| F02-N1 | Reference without a token/cookie cannot access guest details | Playwright API assertions |
| F-Agency-H1 | Scoped metrics → create/edit/archive listing → reservation approval → export → calendar → save profile | Playwright |
| F-Platform-H1 | Cross-agency dashboard → approve provider → support inbox → mobile menu | Playwright |
| F-Partner-H1 | Public application → approve → create manager → password sign-in → empty own workspace | Playwright |
| F-Support-H1 | Public support message → platform inbox → resolved | Playwright |
| F-Security-N1 | Anonymous workspace access returns 401; agency queries exclude other agencies | Playwright API assertions |
| F-Security-N2 | Agency cannot approve another agency or edit another agency's listing | Playwright API assertions |
| F-Security-N3 | Foreign-origin mutation rejected; malformed booking cannot choose its price | Playwright API assertions |
| F-Security-E1 | Valid request ignores a forged total; identical retry returns same reference/token; changed retry conflicts; cancelled trip cannot be completed | Playwright API assertions |
| F-Mobile-E1 | 390px storefront, menu, catalog filters, booking form, dashboard; document has no horizontal overflow | Playwright + screenshots |
| A11y | Axe WCAG A/AA scans on visited screens, named controls, dialog focus, status announcements | Playwright / axe |
| I18N-H1 | Browser preference localizes the first server render; saved French/Arabic choice overrides it | Playwright + locale unit cases |
| I18N-H2 | Switch English → French → Arabic mid-search/booking; input, filters, API values, price, and guest access remain correct | Playwright |
| I18N-H3 | French agency listing edit and Arabic platform desktop/mobile navigation, RTL width, and accessibility | Playwright / axe |
| I18N-E1 | Matching message keys/placeholders, static-copy/catalog coverage, personal-value preservation, and localized search | Node unit tests |
| Runtime | Browser exceptions, unexpected console errors, and 5xx responses fail tests | Playwright listeners |
| Partner-doc-H1 | Full application → review all fields → download exact attachment as platform → approve → provision manager | Playwright |
| Partner-doc-N1 | Signed-out and agency staff cannot download the registration file | Playwright API assertions |
| Partner-doc-N2 | Forged PDF signature and oversized multipart upload are rejected; invalid schema/declarations/capacity fail | Playwright + Node tests |
| Public-content-H1 | Guide index → article → grouped FAQ → search with different return city → request initialized with that city | Playwright / Axe |
| Localized-partner-H1 | `/ar/list-your-property` preserves hostname and activates RTL; field/file state survives French switch; 390px has no overflow | Playwright / Axe |
| Platform-UX-H1 | Keyboard work-queue link → correct requested status; pagination/reset; filter survives reload | Playwright / Axe |
| Platform-UX-H2 | Agency status/search/sort and empty reset; suspension impact dialog/cancel; global search does not change agency filters | Playwright / Axe |
| Platform-UX-H3 | Support search/status/reset; Arabic mobile overview and navigation have no overflow or Axe violations | Playwright / Axe |

Payment, refund, email delivery, inventory concurrency, screen-reader speech output, extended offline recovery, real document verification, and production-provider credentials are not verified because those integrations are not present. Keyboard focus is implemented in primitives and dialogs; a full manual assistive-technology audit remains separate from automated Axe checks.

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:e2e` with the development server running. Screenshots are stored in `clone-screens/`; the HTML test report is generated in `../playwright-report/`.
