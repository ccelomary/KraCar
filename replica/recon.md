# Recon map: Marhire (web)

Date: 2026-10-20 (Africa/Casablanca). Public-source recon completed.

Scope: responsive traveler website, discovery across cars, private drivers, boats and activities, with car rental traced through the three public reservation steps. Partner acquisition and informational pages are supporting surfaces. Payment and post-booking behavior are documented only where public evidence supports them.

For: the user's independent Morocco travel service. Assumption: use original branding, copy, photography, inventory and supplier agreements. No business model, implementation stack or launch authorization is implied.

Evidence labels: **observed** means a rendered page or public browser interaction was inspected; **documented** means a public page describes behavior without a completed transaction; **inferred** means a proposed implementation concept. Observed UI is not proof of a working backend.

## Sources

| ID | Source | URL | Purpose |
| --- | --- | --- | --- |
| R01 | Homepage | https://marhire.com/en | Core services and navigation |
| R02 | Support | https://marhire.com/en/support | Changes, support, contact form |
| R03 | FAQ | https://marhire.com/en/faq | Booking and payment claims |
| R04 | Car category | https://marhire.com/en/category/car-rental | Discovery and price units |
| R05 | Car detail | https://marhire.com/en/details/hyundai-i10-agadir | Reservation wizard |
| R06 | Terms | https://marhire.com/en/terms-conditions | Usage and booking restrictions |
| R07 | Cancellation | https://marhire.com/en/cancellation-policy | Policy hierarchy |
| R08 | Insurance | https://marhire.com/en/insurance-conditions | Protection and deposit rules |
| R09 | Drivers category | https://marhire.com/en/category/private-driver | Search inputs and discovery |
| R10 | Driver detail | https://marhire.com/en/details/mercedes-vito-marrakech-with-driver | Estimated quote and two-step form |
| R11 | Boats category | https://marhire.com/en/category/boats | Public category source; not interacted with |
| R12 | Boat detail | https://marhire.com/en/details/tangier-private-boat-rental-minimum-2-hours-up-to-20-people | Gallery, capacity and booking options |
| R13 | Activities category | https://marhire.com/en/category/things-to-do | Public category source; not interacted with |
| R14 | Activity detail | https://marhire.com/en/details/taghazout-surf-lesson-2-hours-coach-board-wetsuit | Options, guests, time preference |
| R15 | Partner application | https://marhire.com/en/list-your-property | Application fields and manual onboarding |
| R16 | Destination | https://marhire.com/en/city/agadir | City-scoped discovery |
| R17 | Car results | https://marhire.com/en/car-search?pickup=&dropoff=&pickup_date=&dropoff_date= | Observed navigation from homepage Search with defaults |
| R18 | Blog entry point | https://marhire.com/en/blog | Linked on homepage; not opened |
| R19 | Article example | https://marhire.com/en/article/speedboat-rental-morocco-safety-weather-booking-tips | Public search result; article template not visually inspected |
| R20 | Privacy | https://marhire.com/en/privacy-policy | Link observed; contents not reviewed |
| R21 | Cookies | https://marhire.com/en/cookie-policy | Link observed; consent UI inspected separately |

No separate subscription pricing, developer API, changelog, app-store listing or public walkthrough was established in the focused source search. R02/R03 provide the available help material; category/detail prices provide the relevant commercial context. Their absence here is not proof they do not exist. No account was used.

### Terms and research boundary

R06 section 14 restricts scraping, copying at scale, reverse engineering and misuse of the site/booking flows; section 1 states the site's terms apply to access. This is a public UX observation record, not a finding of permission to reproduce protected material. Remain on public sources and build independent functionality; any deeper access or reuse needs a separate rights assessment. No bundles, source code, private APIs, network logs, crawler, bulk asset download, account creation, payment, partner application or outgoing support message was used. Reference screenshots stay in `replica/screens/` and must be excluded from shipped assets.

## Core loop

A traveler selects a service, city and dates, compares offers and conditions, configures the trip, provides contact details, then completes the required payment/approval process to obtain a confirmed service and pickup instructions. The public car journey is guest-oriented; R03 explicitly says customer accounts are not yet available.

The product combines a discovery catalog, reservation forms and local operational coordination. A search result should not be treated as a real-time inventory guarantee: R05 offers the selected car or a similar one, R10 calls the driver price an estimate, and R06 says confirmation forms the booking.

## Screens

IDs identify screen templates or meaningful wizard stages, not every city, listing or translation. Overlays are component states, not separate routes. Relative routes are on `https://marhire.com`.

| ID | Screen | Route / how to reach | Purpose | Key components | States seen / evidence |
| --- | --- | --- | --- | --- | --- |
| S01 | Home | `/en` | Choose service and begin discovery | Promo strip, header, language menu, service tabs, search panel, review and destination carousels, offer cards, FAQ, footer, support launcher, consent | Observed desktop/mobile 390x844, empty search, disabled return date, mobile drawer open, initial consent, brief disabled controls during initialization; R01 |
| S02 | Car search results | `/en/car-search?...` from S01 Search | Compare and narrow offers | Search summary, filter sidebar, result count, sort, horizontal result cards, Load More | Observed populated default search: 376 results and 12 visible initial cards, recommended and ascending-price selections; filter controls inspected, successful filter application and empty results not established; R17 |
| S03 | Car detail / trip details | `/en/details/hyundai-i10-agadir`, step 1 | Inspect car and configure dates and handover | Breadcrumbs, gallery, specs, long description, terms links, fixed listing city, dates/times, two addresses, return city, extras, coupon, price summary | Observed blank, filled, required-field summary and inline errors, disabled decrement at zero, past dates disabled, hourly time choices; R05 |
| S04 | Car protection | S03 Continue, same route, step 2 | Compare cost, deposit, excess and age requirements | Three-stage progress, four plan radios, policy comparison link, recalculated total, Back/Continue | Observed four plans; Premium preselected; quote sample below; R05/R08 |
| S05 | Traveler information | S04 Continue, same route, step 3 | Collect guest details and consent | Names, email, WhatsApp with country selector, residence country, DOB, flight, requests, company checkbox, policies checkbox, quote, Confirm Reservation | Observed empty form and final CTA; company checkbox not expanded; no identity/contact data entered and no reservation submitted; R05 |
| S06 | Category / subcategory landing | `/en/category/car-rental`, `/private-driver`, `/boats`, `/things-to-do`; city and subcategory links | Organic discovery and category-specific search | Hero, search, benefits, city links, category chips, listing rows, FAQ | Public rendered-text evidence for category pages; populated cars/driver sections; city/subcategory variants linked, not all visited; R04/R09/R11/R13 |
| S07 | Private driver detail | `/en/details/mercedes-vito-marrakech-with-driver` | Request a suitable transfer | Shared detail layout, two-stage progress, service date/time, airport/intercity service type, pickup/dropoff address, passenger/luggage counts, coupon, estimated quote | Observed blank first stage; eight-passenger/six-luggage example; actual final quote and second stage not traversed; R10 |
| S08 | Boat detail | `/en/details/tangier-private-boat-rental-minimum-2-hours-up-to-20-people` | Configure a charter/boat outing | Gallery with four images, captain/capacity/port specs, two-stage wizard, date, time, option select, guest stepper, coupon | Observed blank first stage, default 10:00 and one guest; option menu and second stage not traversed; R12 |
| S09 | Activity detail | `/en/details/taghazout-surf-lesson-2-hours-coach-board-wetsuit` | Configure an experience | Gallery with six images, activity/pickup/type/difficulty specs, date, option select, time preference, guest stepper, coupon, two-stage wizard | Observed blank first stage; no option or time selected; R14 |
| S10 | Destination landing | `/en/city/agadir` | Discover several services in one city | Destination hero, shared tabs/search with city prefilled, benefits and category offers | Observed Agadir preselected and return date disabled until pickup; R16 |
| S11 | Support | `/en/support` | Get help before/during/after travel | WhatsApp/email/phone/emergency cards, topic grid, name/email/optional-phone/message form, privacy checkbox | Observed blank form and public contact links; no message sent; R02 |
| S12 | FAQ | `/en/faq` | Explain booking/service rules | Grouped questions for payments, cars, drivers, boats/activities | Public rendered text observed, not interaction-tested; R03 |
| S13 | Partner acquisition | `/en/list-your-property` | Recruit local providers | Benefits, application steps, business/owner/contact/category/city/RC/fleet/description inputs, RC upload, authority and policy checkboxes | Public blank form observed in rendered text, PDF/image upload limit 5 MB documented; no submission; R15 |
| S14 | Policy reader | `/en/terms-conditions`, `/cancellation-policy`, `/insurance-conditions`; linked privacy/cookie siblings | Show terms before commitment | Legal sidebar, heading/date, long-form sections and insurance tables | Terms/cancellation/insurance read; privacy/cookie body not reviewed; R06-R08/R20/R21 |
| S15 | Blog index | `/en/blog` | Travel-content discovery | Article cards and category entry points | Link and homepage article previews only; standalone template unverified; R01/R18 |
| S16 | Article | `/en/article/:slug` | Answer travel questions and lead to services | Expected title, category, date, article body, booking links | Public search text for example; standalone visual layout unverified; R19 |
| S17 | Payment / checkout | After Confirm Reservation; route unknown | Collect required advance/full payment | Provider-hosted or embedded form unknown | Documented by R01/R06, not visited; payment logos do not prove enabled methods |
| S18 | Confirmation / voucher | After approval/payment; route unknown | Communicate booking reference, terms and meeting details | Confirmation, receipt and management link documented | R02/R03/R06/R07; no actual voucher, email or success screen seen |
| S19 | Manage booking | Link sent with confirmation; route unknown | Request a change/cancellation | Exact controls and access mechanism unknown | Documented R02/R07; conflicts with R03's support-only explanation; not visited |

**Coverage:** 19 inventory entries: 14 with public rendered-page evidence (S01-S14), two linked/search-only (S15-S16), three documented downstream surfaces (S17-S19). Desktop live interaction concentrated on S01-S05/S07-S11/S14; mobile checked on S01 only. Driver/boat/activity result routes and their filter variants are unknown; do not invent them as observed routes.

### State coverage and checks still needed

| State | Observed | Required follow-up / independent-version behavior |
| --- | --- | --- |
| Initial/empty form | S01/S03/S05/S07-S09/S11/S13 | Clear required fields, accessible labels and defaults |
| Populated results/quote | S02/S03/S04 | Quote recalculation and invalidation when dates/options change |
| Validation errors | S03 Continue with blanks | Date ordering, capacity, age-plan mismatch, invalid email/phone, coupon failure still untested |
| Loading/initialization | Temporary disabled tabs/search and return-city selectors | Prevent input loss during initialization; precise loading design not mapped |
| Empty results | Not established | Explain no matches and offer filter reset / nearby dates |
| Network/server error | Not observed in app | Preserve form and offer retry; one text-browser source fetch failed, which is not evidence of an app error state |
| Permission/auth denied | Not observed | Secure any booking-link access and partner/admin tools; no auth screen assumed |
| Mobile | Home and drawer only | Results filter drawer, checkout keyboard behavior, galleries, full forms and RTL still need checks |
| Payment outcomes | None | Failed, cancelled, pending, duplicate and successful payment states |
| Inventory races | None | Recheck before confirmation; explicit substitution/approval behavior |

An Electric filter attempt did not establish a changed result set. It is recorded as inconclusive, not as proof of either a filter defect or available electric cars. Form updates sometimes appeared after a later observation; no timing-based bug claim is made.

## Flows

Click counts below separate **primary action/navigation clicks** from field entry. A picker opening and selecting are two interactions; typing/focus/scrolling are excluded from primary counts. Only observed segments have measured counts; full transactional paths are estimates.

| ID | Goal and path | Happy-path primary clicks | Edges / evidence boundary |
| --- | --- | --- | --- |
| F01 | Discover car: S01 Search -> S02 -> S03 | 2: Search, listing Book. First transition observed; detail opened directly from a public listing URL | Defaults allow search without dates/city; narrow filters, reset, sorting, Load More. Filter-result correctness, sold-out and invalid date states unverified |
| F02 | Reserve car: S03 -> S04 -> S05 -> S17 -> S18 | 3 through reservation submission (two Continue plus Confirm Reservation); only first two completed. From S01, minimum 5 primary clicks plus provider checkout | Public wizard observed through S05. Four date/time pickers require about 8 interactions, plus addresses; return city defaults to pickup. Contact/residence/DOB/policy interactions add more. Exact full count unknown. Age-plan eligibility, price expiry, one-way fee, coupon failure, payment retry, substitution |
| F03 | Arrange private driver: S01/S06/S10 -> S07 -> traveler stage -> S17/S18 | Estimated 4 primary actions from a search entry: Search, Book, Continue, submit; later steps unverified | Airport vs intercity, luggage/passenger capacity, valid flight, inaccessible riad, changed route, estimated vs final price |
| F04 | Book boat: S01/S06/S10 -> S08 -> traveler stage -> S17/S18 | Estimated 4 primary actions from search, plus date/time/option/guest controls; search and later steps not traversed | Capacity, minimum charter duration, per-person vs per-group price, weather/operator cancellation, unavailable option/slot |
| F05 | Book activity: S01/S06/S10 -> S09 -> traveler stage -> S17/S18 | Estimated 4 primary actions from search plus date/options/time preference/guest input; later steps unverified | Participant limits, pickup inclusion, variable duration, ability/age restrictions and weather |
| F06 | Obtain help: any page -> S11 -> channel or contact form | 2 primary actions: Support then channel/Send Message; submission not performed | Booking reference, delivery coordination, emergency routing, validation, failed send. Opening a chat is not booking confirmation |
| F07 | Change/cancel: S18 management link -> S19 or S11 -> support | Count unknown; minimum one link plus action if self-service exists | Timestamp request at submission, listing-specific cutoff, refund eligibility, difference in new price, early return; UI not inspected |
| F08 | Become supplier: S01 -> S13 -> application -> manual verification/terms/setup | 2 primary actions to submit, 3 if using Apply Now anchor; no submission performed | Invalid/oversized RC file, authority, category fields, duplicate application, rejection. Public copy describes staff setup; supplier dashboard not established |

## Components

Only states explicitly marked observed were exercised. Focus, hover, disabled, pending and error variants are implementation requirements where still unverified.

| ID / component | Variants | Observed states / gaps | Screens |
| --- | --- | --- | --- |
| C01 Header/navigation | Desktop logo, language, Travel Shop, support, partner CTA; mobile menu drawer | Desktop and mobile drawer observed; language route options linked, translation quality/RTL untested | S01-S16 |
| C02 Promotion strip | Coupon and expiry | Visible time-limited promotion; independent content required | S01-S16 |
| C03 Service tabs | Cars / drivers / boats / activities | Cars active, temporary disabled initialization; other search variants from public category text | S01/S06/S10 |
| C04 Search panel | Cars: pickup/return/date range; drivers: from/to/date/passengers | Empty/default and city-prefilled; return date disabled before pickup. Boat/activity search behavior not fully inspected | S01/S02/S06/S10 |
| C05 Location select | All cities, same pickup, individual city, fixed listing city | Default and fixed city; options/menu selection not fully exercised | S01-S03/S06/S10 |
| C06 Calendar and time popover | Pickup/return/service/activity/DOB; hourly time buttons | Calendar past days disabled, month controls; 00:00-23:00 choices. DOB picker UI unexpanded | S01/S03/S05/S07-S09 |
| C07 Listing card | Compact carousel vs horizontal results; category attributes and price unit | Filled, badges, optional supplier mark, Book/WhatsApp; result CTA layout observed | S01/S02/S03/S06-S10 |
| C08 Filter/sort | Type, brand, transmission, fuel, numeric price; recommended/ascending/descending | Sidebar and sorting menu observed; successful filtered state not verified | S02 |
| C09 Gallery | One image vs multi-image thumbnails/lightbox trigger | Single car image, boat/activity multi-image controls visible; expanded gallery not opened | S03/S07-S09 |
| C10 Specification block | Car vs transfer vs boat vs activity fields | Filled values; category-specific schema | S03/S07-S09 |
| C11 Booking wizard | Car three stages; other services two | Progress and Back/Continue; car stages all read | S03-S05/S07-S09 |
| C12 Protection card | Basic, Smart, Premium, Zero-risk radios | Premium checked by default; daily surcharge, deposit, excess, age, plan total shown | S04 |
| C13 Number/quantity input | Add-on stepper, guests, passengers/luggage | Decrease disabled at zero/one; displayed add-on maximums; upper-limit behavior untested | S03/S07-S09 |
| C14 Price summary | Base duration/unit, extras/protection, tax, total; estimated driver price | Filled/recalculated; exact tax formula and rounding not inferred from one sample | S03-S05/S07-S09 |
| C15 Guest/contact fields | Name, email, international phone, country, DOB, flight, requests; company option | Empty traveler and support forms; company expansion not inspected | S05/S11/S13 |
| C16 Validation/feedback | Error summary and inline messages; notification region | Required errors observed S03; success toast/server failures not observed | S03-S05/S11/S13 |
| C17 Policy/consent | Terms link cards, booking agreement checkbox, privacy checkbox, cookie dialog | Consent reject action, initial modal with reject/customize/accept; preferences persistence not fully verified | S01/S03/S05/S07-S09/S11/S13/S14 |
| C18 Support launcher | Floating WhatsApp button and category chooser | Button and category choices visible; no outgoing message | Shared |
| C19 Content rows | Benefits, review carousel, destination cards, FAQ sections, articles | Filled and mobile carousel controls; original review content excluded | S01/S06/S10/S12/S15/S16 |
| C20 Footer | Service/city links, expanded sections, social/payment marks, cookie management | Desktop expanded, mobile accordion behavior not tested; logos not payment-method evidence | Shared |
| C21 File upload | RC document PDF/image, drag/drop or file picker | Public size/type requirements only; upload not attempted | S13 |
| C22 Buttons | Primary green, light secondary, text link, icon, Back | Default, disabled and active examples; keyboard/focus audit outstanding | Shared |

### Layout notes

Observed desktop references use a white header and panels, dark headings, green/teal calls to action, pale-gray fields, rounded corners and a photographic hero. Detail pages place imagery/content left and the booking panel right. Search results have a left filter column and horizontally arranged cards. The mobile home uses a menu drawer, two-by-two service buttons, stacked inputs and a floating contact button. These are reusable UX patterns; derive an original design system in a later stage rather than copying branding or exact assets. No font identification or precise token measurement is claimed.

## Inferred data model

These are clean-room concepts, not extracted tables or endpoints. IDs and relationship keys are proposed; fields are limited to observed or documented product needs.

| Entity | Candidate fields | Evidence | Confidence |
| --- | --- | --- | --- |
| City | id, slug, localized_name, timezone, supported_categories | S01/S03/S10 city selectors and routes | High for concept; storage inferred |
| Category | id, slug, label, unit_defaults, attribute_schema | S06 four services, S07-S09 variants | High |
| Supplier | id, business_name, categories, city_id, verification_state, contact_channels | S13 and R06 independent partners | High for concept; verification state inferred |
| Listing | id, slug, category_id, supplier_id, city_id, title, specifications, inclusions, exclusions, media_refs, base_rate, rate_unit, similar_allowed, published | S02/S03/S07-S09 | High; media must be independently supplied |
| ListingOption | id, listing_id, label, duration, rate, unit, capacity | S08/S09 option controls; not expanded | Medium; exact option structure unknown |
| Availability | listing_id, start_at, end_at, capacity, approval_required, status | Date inputs and R06 confirmation-dependent availability | Guess: actual stock/slot algorithm unknown |
| ProtectionPlan | id, listing_id, city_id, name, daily_cost, excess, deposit, minimum_age, coverage_summary, policy_version | S04/R08 four plans | High |
| AddOn | id, listing_id, label, price, unit, max_quantity | S03 extra driver/booster/child seat | High |
| Coupon | id, code, discount_rule, valid_from, expires_at, applicability | S01 promo and S03 coupon input | Medium; redemption/stacking rules untested |
| Quote | id, listing_id, option_id, start_at, end_at, timezone, locations, counts, plan_id, extras, coupon_id, currency, base_amount, tax_amount, total, amount_due_now, balance_due, expires_at, is_estimate | S03/S04 price changes, S07 estimate, R06 prepayment | High for monetary concept; expiry and due amounts inferred |
| Traveler | id, first_name, last_name, email, whatsapp, residence_country, birth_date | S05 fields | High; reusable account identity not implied |
| Booking | id, reference, quote_snapshot, traveler_id, supplier_id, state, pickup_details, flight_number, requests, company_invoice_details, confirmed_at, voucher_ref, policy_snapshot | S05/R02/R03/R06 | High for concept; state machine and snapshots proposed |
| Payment | id, booking_id, provider_reference, amount, currency, state, paid_at, refund_reference | S17 documented R06/R07 | Medium; integration and webhook design unknown |
| SupportRequest | id, booking_reference, name, email, phone, message, channel, submitted_at, request_type, resolution_state | S11, cancellation timestamp R07 | High for concept; workflow fields proposed |
| PartnerApplication | id, company, owner, email, phone, whatsapp, category_id, city_id, rc_number, fleet_count, document_ref, description, authority_ack, policy_ack, review_state | S13 | High; decision lifecycle inferred |
| ContentPage | id, locale, kind, slug, title, body, category_id, published_at, version | S12/S14-S16, localized links | Medium; CMS unobserved |
| ConsentRecord | id, booking_or_session_ref, purpose, policy_version, choice, recorded_at | S01/S05/S11/S13 consent UI | Medium; storage/identifier design inferred |

Relationships: City 1-n Listing; Category 1-n Listing; Supplier 1-n Listing; Listing 1-n options/plans/add-ons/availability records; Quote selects one listing and optional plan/options with multiple extras; Traveler 1-n Booking without requiring accounts; Booking references a quote and policy snapshot and has 0-n Payments and SupportRequests. PartnerApplication may become a Supplier after review. ContentPage supports translations/policy versions. Use a join table if a supplier or listing serves multiple cities; the public evidence does not establish that storage choice.

No authenticated CustomerAccount, SupplierDashboard, AdminPanel, partner payout ledger or review-writing system was observed. A back office may be necessary for the independent service, but its design is a new requirement, not claimed parity.

## Business rules and unresolved contradictions

| Topic | Evidence | Implication for your version |
| --- | --- | --- |
| Confirmation | S03 says selected car or similar; S07 estimated final quote; R06 requires issued confirmation; marketing sometimes says instant | Separate inquiry/quote/payment/confirmed status. Do not label an unapproved request confirmed |
| Plan eligibility | S04 sample: minimum ages 21/21/23/29 for Basic/Smart/Premium/Zero-risk; S05 generic minimum says 18 | Validate both booker eligibility and assigned driver's selected-plan requirements explicitly |
| Quote sample | Oct 25 12:00 -> Oct 27 13:00 displayed 3 days x EUR29 = EUR87, tax EUR4; Premium adds EUR75 -> EUR166 | More than 48 hours billed as three days in this observed sample. Do not infer a universal tax rate, grace period, or day-rounding rule from one quote |
| Default plan | Premium preselected on S04; Basic total EUR91, Smart EUR136, Premium EUR166, Zero-risk EUR211 for sample | Make selected coverage and resulting total unmistakable; supplier-specific rates must be original data |
| Mileage | Card/spec says unlimited; detail text variously says six days or more, more than six days, and 250 km/day for shorter hire; R06 says over six days with approved route for shorter hire | Decide an exact threshold, allowance and overage rule, and use one source of truth |
| Changes | R03 says no accounts and support handles all changes; R02/R07 reference a Manage Booking link | Guest checkout is evidenced; self-service capabilities need verification, not an invented account portal |
| Refunds | R07 describes standard 48-hour eligibility, seven-day group/charter override and listing overrides; R03/R07 differ on processing time | Show selected conditions and preserve their version. Record request time independently from agent response time |
| Payments | R03 mentions pay-on-delivery options; R06 requires partial/full prepayment and permits balance on arrival | Distinguish reservation prepayment, remaining balance and refundable security deposit |
| Time | UI calls Morocco local time GMT, while policy uses Africa/Casablanca | Use the IANA zone and date-specific offset; do not hardcode a fixed GMT offset |
| Transfer price | Category advertises fixed rates while S07 explicitly labels its quote estimated | State when price becomes binding and require customer acceptance of revised amount |
| Stock | Result counts include city-specific listings; default search works with no dates | Counts are catalog entries, not a measured available fleet for the travel period |

## Feature matrix

See `features.csv`: **29 must, 18 should, 4 could, 4 skip** (55 rows total; 51 candidate features). Every `clone` value starts at `no`. `original` uses `yes`, `documented`, `unverified` or `no` to distinguish evidence. `priority=skip` rows are explicit exclusions and must be excluded from parity scoring; other priorities are must/should/could. Priorities are proposed for an independently operated car-first release; should/could rows extend to the other categories and broader content.

## Out of scope (cannot or should not be cloned)

- Marhire trademarks, logo, copy, photography, supplier logos, review text/person identities and existing catalog records. Use independently licensed assets and your own inventory.
- The supplier network, existing customers/bookings, ratings, Trustindex verification, reputation and commercial agreements. An independent review integration cannot inherit these claims.
- Insurance coverage, licensed transport/maritime operations, payment acceptance and fulfillment capacity are operational agreements; copying a UI does not supply them.
- Private endpoints, source code, admin/partner dashboards and customer records. None were accessed or inferred as observed features.
- Real reservations, payment tests, outgoing messages, RC uploads and partner registration were outside this recon.
- Native mobile apps, offline support, loyalty, multi-service carts, customer login, live GPS and automated supplier payouts are not established public features and are not in the proposed scope.

## Size and handoff

19 screen/template entries (14 public-page evidence, two linked/search-only, three downstream unverified), eight flows, 17 candidate entities and 22 component families. Variations by category, city and locale multiply states without necessarily requiring new templates.

**Size: L** for the four-service operational product, roughly a quarter-sized effort as a planning category, not a delivery promise. A car-first slice with owned inventory and manual fulfillment is **M** (a few weeks as an order of magnitude). A marketing catalog alone is smaller but does not complete the core booking loop.

The three hardest parts are (1) inventory/quote validity and supplier confirmation or substitutions, (2) coherent duration, tax, protection, eligibility, deposit and cancellation rules, and (3) payment/confirmation/refund reconciliation with reliable customer and supplier communication. Weather-dependent services and localization add operational complexity.

Next stage: `$replica-architect`, using the evidence labels and unknowns here to select the smallest operational scope, a quote/booking state machine, authorization rules and an independent catalog. Before architecture is finalized, resolve ownership of inventory, binding quote rules, plan eligibility, prepayment/refund behavior and whether changes are self-service or support-assisted. This handoff does not authorize implementation or deployment.

## Reference screenshot index

Files are local research references, never product assets. Default desktop capture was approximately 1206x478; mobile was 390x844. Images are viewport captures, not exhaustive pages; DOM/text observations provide additional field evidence.

| File | Reference content |
| --- | --- |
| `screens/S01-home-desktop.png` | Desktop hero/search entry |
| `screens/S01-home-mobile.png` | Mobile home and stacked form |
| `screens/S01-menu-mobile.png` | Mobile navigation drawer |
| `screens/S02-car-results-desktop.png` | Populated result layout |
| `screens/S02-filter-attempt-desktop.png` | Inconclusive filter attempt; not an empty state |
| `screens/S03-car-details-desktop.png` | Car detail header/gallery and booking panel |
| `screens/S04-protection-desktop.png` | Protection-stage quote summary/footer; plan options are above this viewport and recorded in the screen inventory |
| `screens/S05-traveler-desktop.png` | Traveler-stage start; remaining fields documented from rendered UI |
| `screens/S07-driver-desktop.png` | Transfer detail layout |
| `screens/S08-boat-desktop.png` | Boat detail layout |
| `screens/S09-activity-desktop.png` | Activity detail layout |
| `screens/S11-support-desktop.png` | Support entry |

No screenshots of payment, success, account, management, server errors or empty-result states are claimed.
