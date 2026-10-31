# English, French, and Arabic

Implemented 21 October 2026. Existing URLs and reservation references remain stable. No external translation service or browser-only DOM rewriting is used.

## Language selection

The public header, sign-in screen, and workspace toolbar include a native, labeled language selector with endonyms: English, Français, العربية. The `atlas-locale` functional cookie stores an allowlisted `en`, `fr`, or `ar` preference for one year. An explicit valid cookie takes precedence; otherwise the server chooses a supported language from weighted `Accept-Language` preferences, falling back to English. The preference survives navigation, sign-out, and reloads.

`router.refresh()` updates server content and metadata while preserving client state. A traveler can change language mid-search, during protection selection, or on the private booking page without clearing fields or losing the private-link state. The root document declares the actual `lang` and `dir` from its first server render.

## Sources and formatting

- `src/i18n/core.ts`: locale allowlist, preference resolution, exact-message translation and placeholder interpolation.
- `src/i18n/server.ts`: request-scoped locale/dictionary loading and translated metadata. Only the active dictionary is passed to client components.
- `src/i18n/provider.tsx`: shared client translation context.
- `src/i18n/messages/fr.json` and `ar.json`: matching authored dictionaries, including navigation, forms, statuses, charts, support, policies, sample catalog/protection descriptions, and operational errors.
- `src/i18n/search.ts`: accent- and Arabic-mark-insensitive search across original and translated display text.
- Money and date helpers use `en-GB`, `fr-MA`, or `ar-MA`. Currency remains EUR; scheduling remains Africa/Casablanca. Localized CSV headers/statuses and guest-request downloads retain canonical reference IDs and dates.

Translations are rendered by React/server components. Input names, category/plan/status codes, listing IDs, city values, URL parameters, prices in cents, and API authorization never depend on a translated label. Native options explicitly retain their original values. User names and freeform traveler/support messages are preserved; unknown provider-authored content falls back to its original text. Interpolated values are not implicitly translated, preventing a person named like a UI label from being renamed.

## Arabic layout

Public `/{en|fr|ar}` entry routes set the same preference cookie and redirect to the matching internal home, partner, category, destination, detail, policy or guide page. Relative redirects preserve the original host so local/custom domains retain the cookie. Registration forms and selected files survive switching language. The marketplace refresh adds 127 translated entries, including onboarding, document errors/privacy, FAQ answers and original guides.

Arabic sets `dir="rtl"` on the document, puts the workspace sidebar on the right, mirrors directional controls, adjusts table/text alignment and search adornments, reverses the hero’s layout, and uses an Arabic-capable system-font stack with appropriate heading line height. Brand identity stays left-to-right. Email, phone, dates, passwords, and private URLs are isolated as LTR data. Mobile navigation remains dismissible and offscreen when closed; the language selector stays available at 390px.

## Validation

Unit checks cover weighted preferences, invalid cookie fallback, dictionary parity, placeholder preservation, user-value preservation, authored static-message coverage, sample catalog/plan copy, and multilingual search. Browser checks cover server-rendered browser-language selection, cookie precedence, language persistence, mid-form switching, canonical filters and booking submission, private-access continuity, French agency editing, Arabic platform navigation, desktop/mobile widths, and Axe accessibility scans. The existing English journey suite remains part of the regression run.

Policy translations describe the same development-only operational boundary as English; they still need commercial review before launch. Date-picker chrome and native browser validation follow the browser’s own locale. Provider-authored content is not automatically machine-translated.
