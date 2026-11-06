# KraCar visual refresh — 3 November 2026

Implemented an original vehicle-led marketplace direction after reviewing these Dribbble references:

- [AutoDealer — Premium Car Rental Website Design, Phenomenon Studio](https://dribbble.com/shots/25607379-AutoDealer-Premium-Car-Rental-Website-Design): vehicle photography, generous sans-serif titles, restrained interface chrome.
- [Car Rental Platform Website Design, Conceptzilla](https://dribbble.com/shots/22268137-Car-Rental-Platform-Website-Design): vehicle discovery and booking hierarchy.

Reference images in output/inspiration are review material only. They are not served by the application. Existing application photography remains in use.

The implemented palette is charcoal, white and a pale green accent. The homepage now contains a vehicle hero, prominent service search, category links, the live car selection, destination photography, a payment example with FAQs and the professional registration entry point. Decorative numbering, coordinates, serif headings, repeated slogan sections, the announcement banner and floating help overlays have been removed. Help remains in navigation and the footer. Categories and automatic-transmission links initialise real catalogue filters.

Manrope and Noto Sans Arabic are self-hosted. Their OFL licences are included in public/fonts. The prior Noto Naskh font remains available for document generation.

Validation: production build, TypeScript, targeted ESLint, 30 unit checks and 12 Playwright scenarios pass. The browser scenarios use controlled API fixtures; they do not certify live payment or PostgreSQL connectivity. Screenshots cover desktop/mobile English, French and Arabic. Axe checks found no serious/critical issues in the tested homepage and booking panel.
