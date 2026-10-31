# Atlas Journeys design system

The independent UI uses emerald for actions, lime for small highlights, sans serif discovery headings, and compact operational typography. The centered image hero, pill service tabs, sticky navigation, horizontal desktop result cards and centered application draw on observed public UX patterns; no reference HTML, styles, branding, or media were reused.

## Tokens and layout

`tokens.css` is imported by `src/app/globals.css` and supplies Tailwind 4 `@theme` tokens plus shared CSS variables. `tokens.json` records color roles and contrast pairs. Desktop content is capped at 1280px. The workspace sidebar is 248px; it becomes a dismissible drawer below 900px. Reservation tables become tappable summary cards below 640px. The public catalog uses a mobile filter disclosure rather than a permanently visible sidebar.

## Primitives

| Component | Variants and states | Accessibility |
| --- | --- | --- |
| Button | Primary, secondary, ghost, lime, danger; hover, disabled, busy | Semantic button/link, text labels, visible focus outline, icon-only accessible names |
| Input/select/textarea | Default, required, disabled, validation error | Visible labels, native field validation, server validation, errors announced with alert |
| Badge | Requested, awaiting payment, confirmed, completed, cancelled, declined, active, pending, suspended, published, archived | Status expressed in words as well as color |
| Card | Listing, metric, chart, agency, support | Hierarchical headings; real actions; illustrative images described |
| Modal | Reservation review, listing editor, access provisioning, notifications, cancellation | Dialog role, labeled title, focus trap, Escape, focus restoration, scroll lock |
| Empty/error | No listings, no matching reservations, expired access, fetch failure | Specific next action, retry where appropriate, preserves active form data |
| Loading | Skeleton page and data panels; text on submitting actions | Page loading label; reduced-motion preference supported |
| Charts | Booking-value columns and category donut | Text totals, SVG labels, focusable column values; no invented percentage changes |
| Navigation | Storefront header, desktop sidebar, mobile drawer | Current page semantics, named regions, keyboard actions, skip-to-content link |

## Platform operations workspace

The platform workspace has a dark emerald navigation rail, a sticky neutral top bar, readable content spacing and a separate operational work queue above reporting. Queue counts cover all dates; report cards and charts follow the selected reporting period. Counts use actual workspace records. Scheduled-value captions use neutral indicators rather than implying an unmeasured positive trend.

Agency filters distinguish all/pending/active/suspended with accurate counts, review-first/name sorting and resettable empty results. Catalog visibility/category filters and support status/text filters expose the matching records. Global reservation search is independent of page-local searches. Reservation lists show ten rows per page, reset pagination when filtered, and save their status in the URL. Filters update the native browser history and Next.js search parameters without fetching the already loaded records again.

Agency suspension opens a focus-trapped confirmation dialog explaining hidden listings, lost agency access and the affected record counts. Cancelling leaves the agency active. Mobile and RTL layouts retain the same actions, counts and clear empty states; navigation labels remain stable when count badges change.

The public application has a keyboard-accessible upload area with drag/drop, file metadata, error announcements and a private-review explanation. Platform agency cards disclose the complete application and authenticated attachment download. Native FAQ disclosures and original guide cards/articles provide informational content in all three languages.

## Data honesty

Every local workspace is marked as demonstration data. Monetary charts represent accepted reservation value, not received cash or payouts. Deposit is displayed separately from the trip total. The guest flow consistently calls submission a request. No fake reviews, star ratings, or customer testimonials are used. Policies describe the development boundary and require operator review before commercial launch.
