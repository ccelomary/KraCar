import { getTranslator } from "@/i18n/server";
import { notFound } from "next/navigation";
import PublicShell from "@/components/public-shell";
const policies: Record<
  string,
  {
    title: string;
    sections: [string, string][];
  }
> = {
  terms: {
    title: "A clear start to your journey",
    sections: [
      [
        "About this preview",
        "Atlas Journeys is an independent travel application in development. Its local preview uses fictional agencies, travelers, prices, and reservations. No real inventory or commercial agreement is implied.",
      ],
      [
        "Reservation requests",
        "Submitting the form creates a request, not a confirmed service. The provider must review availability, driver eligibility, route, and any special requirements. Any revised quote must be accepted before payment or confirmation.",
      ],
      [
        "Prices and deposits",
        "Prices are shown in EUR. Car rentals use calendar-date durations, with each date-to-date interval billed as a day. Activities are per person. Selected cover and extras are itemized. Refundable security deposits are separate from the reservation total.",
      ],
      [
        "Eligibility and delivery",
        "Car requests require the driver to meet the selected plan’s minimum age and to have held a valid licence for at least one year. Exact pickup, delivery times, vehicle specifications, and provider conditions are reviewed before confirmation. Photography is illustrative.",
      ],
      [
        "Payments and confirmation",
        "This version collects no card details or payments. Approval only changes the reservation to awaiting payment. A production payment and inventory workflow must be configured before real bookings can be confirmed.",
      ],
      [
        "Before commercial launch",
        "The operator must publish verified business identification, contact details, provider agreements, binding insurance conditions, and reviewed customer policies. These preview terms describe current application behavior.",
      ],
    ],
  },
  cancellation: {
    title: "When plans take a different turn",
    sections: [
      [
        "Pending requests",
        "A request that is still pending or awaiting payment can be withdrawn through its private booking link. No payment is collected by this preview.",
      ],
      [
        "Confirmed reservations",
        "Contact support with your reservation reference to request a change or cancellation. The accepted provider conditions and the timing of your request determine any applicable charges. No automatic refund promise is made here.",
      ],
      [
        "Changed dates or routes",
        "A change may require new availability and a revised quote. Your original trip remains subject to its current conditions until a replacement is accepted and arranged.",
      ],
      [
        "Weather and operator decisions",
        "Outdoor activities depend on safe conditions. The provider reviews weather-related changes and any alternative date or cancellation arrangement with you.",
      ],
    ],
  },
  privacy: {
    title: "Your details, treated with care",
    sections: [
      [
        "Partner registration documents",
        "Partner applications include business and owner details, contact numbers, registration information and an uploaded document. The document is stored separately in MongoDB and can be downloaded only by authorized platform staff for application review. It is not included in public listings or agency downloads.",
      ],
      [
        "What we store",
        "When you request a trip, we store your contact details, itinerary, selected options, price snapshot, consent time, and notes. Driver birth date and licence issue date are checked for eligibility and are not retained by the reservation endpoint. Partner and support forms store the details you submit.",
      ],
      [
        "Who can see it",
        "Your provider can view its own reservations. Authorized platform staff can review reservation, agency, and support records for operational purposes. Private access links give access to their associated reservation; keep them safe.",
      ],
      [
        "Cookies and browser storage",
        "Essential HttpOnly cookies hold staff sessions and guest booking access. Staff sessions expire after 24 hours and guest access cookies after seven days. Cookie preference choices are saved in local browser storage. Your language choice is saved in a functional cookie for one year. This version includes no analytics or advertising trackers.",
      ],
      [
        "Services and data location",
        "Data is stored in the configured MongoDB database. Local development uses a local MongoDB process. Images are served from this application after being sourced from Unsplash; no original reference-site assets are shipped. Production hosting, email, payments, retention periods, and operator contact details must be finalized before launch.",
      ],
      [
        "Your requests",
        "Use the support form to request access, correction, or deletion of your personal data. Include your booking reference but never share staff passwords or your private access token in a public message.",
      ],
    ],
  },
};
export default async function Policy({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const t = await getTranslator();
  const { slug } = await params;
  const policy = policies[slug];
  if (!policy) notFound();
  return (
    <PublicShell>
      <main tabIndex={-1} id="main-content" className="public-container">
        <article className="policy-content">
          <div className="eyebrow">{t("Clear details. Better journeys.")}</div>
          <h1>{t(policy.title)}</h1>
          <div className="notice">
            {t(
              "Development policy \u00B7 Updated 21 October 2026 \u00B7 Review before commercial launch.",
            )}
          </div>
          {policy.sections.map(([title, text]) => (
            <section key={title}>
              <h2>{t(title)}</h2>
              <p>{t(text)}</p>
            </section>
          ))}
        </article>
      </main>
    </PublicShell>
  );
}
