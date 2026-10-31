# Reproduced defects and repairs

| ID | Severity | Reproduction / observed result | Repair / evidence |
| --- | --- | --- | --- |
| B01 | S1 | Submit local sign-in with matching browser origin: normalized Next.js request URL caused 403 | `src/lib/api.ts`: compare configured public origin in production; use request Host in local development. Agency/platform sign-in and hostile-origin regression checks |
| B02 | S2 | Submit a guest request in development: Strict Mode effect replay cleared the token before cookie exchange finished | `manage-booking.tsx`: preserve the capability ref through effect replay; guest request/refresh/cancel regression |
| B03 | S3 | Mobile dashboard document width exceeded 390px despite body width 390px | Positioned hidden table-header labels in their header cells; switched mobile reservation table to summary cards; document-width assertions |
| B04 | S3 | Some muted text failed AA against sand and image backgrounds | Darker muted token and solid hero body text; Axe contrast assertions |
| B05 | S4 | Dashboard growth card showed literal `<br/>` text | JSX line breaks in the two variants; screenshots inspected |
| B06 | S3 | Exact label selectors could not target selects with nested option text | Explicit accessible names on affected destination and visibility controls; mobile filter and listing-editor regression checks |
| B07 | S3 | Time chart excluded future-dated sample creation timestamps while headline included them | Filter reporting interval to cutoff ≤ createdAt ≤ report time |
| B08 | S1 | Sign out of platform and sign in as a newly provisioned manager in the same browser: shared SWR key retained previous dashboard data | Scope cache keys to the server-verified user ID and reset the client runtime on every sign-in/sign-out. Partner provisioning regression asserts a newly created manager sees an empty own workspace |
| B09 | S3 | Rapid entry on the cold sign-in page could precede hydration and lose the email input | Disable sign-in controls until hydration; onboarding test waits for the sign-in document and enabled controls before entering credentials |

No issue is claimed fixed solely by code review. The final run is recorded in `build-log.md`. No original-service defect is asserted by this document.

## Marketplace refresh repairs

| ID | Severity | Reproduction / observed result | Repair / evidence |
| --- | --- | --- | --- |
| B10 | S3 | New emerald color reduced contrast on soft badges and faded text | Darker action token, opaque insight/banner copy; token contrast and desktop/mobile Axe checks |
| B11 | S2 | Local `/ar/list-your-property` redirected from 127.0.0.1 to localhost and lost its language cookie | Relative Location with the selected locale cookie; host/direction regression test |
| B12 | S3 | Browser rejected international phone pattern under modern HTML Unicode-set regex rules | Escape parentheses in both telephone patterns; onboarding console/error assertions |
| B13 | S3 | Exact partner select labels included embedded option text; mobile category links were hidden inside a disclosure | Explicit select names and direct service links in the mobile drawer; onboarding/mobile regression tests |

A search regression test initially clicked the still-visible homepage card while navigation was pending. Its repaired flow awaits the results URL and asserts the return-city query before selecting a result. This was a test synchronization defect rather than evidence of lost application state.

## Platform UX refresh

- Reservation status tabs initially waited for router navigation before updating visible rows. This allowed a fast click to open an item from the prior view. Status selection now updates through Next.js-integrated native history without a server navigation; the URL and visible filter stay in sync, including on reload. Agency-review and pagination flows verify the behavior.
- Count badges changed the accessible name of the support navigation link. Navigation links now retain stable explicit labels; counts remain visually available and the overview exposes named queues.
- The new catalog category filter made an existing broad French test selector ambiguous with the editor category. That test now scopes its selection to the open dialog. This is test repair, not an application defect.
- One guest-flow regression attempt encountered Chromium `ERR_NETWORK_CHANGED` responses. Retain the browser error check and rerun the affected flow; do not suppress transport failures as a UI fix.
- A client-navigation accessibility scan sometimes ran before streamed page metadata had populated the title. Accessibility helpers now first assert a non-empty document title, then run the unchanged Axe rules. Persistent missing titles still fail.
- Repeated suite runs shared the same development client identity and exhausted the real login throttle. Browser tests now use a distinct synthetic forwarded client per case. Application throttling is unchanged.
