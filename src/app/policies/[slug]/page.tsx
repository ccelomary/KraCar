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
  partnership: {
    title: "Partnership agreement",
    sections: [
      [
        "Professional identity",
        "Partners must provide accurate business, tax, insurance, authorisation and settlement details. Offers may be published only after review of the business and contractual conditions.",
      ],
      [
        "Partner responsibilities",
        "The partner provides the service, maintains accurate offers, prices and availability, honours accepted bookings and issues its service invoice. KraCar provides intermediation and separately invoices its service fee.",
      ],
      [
        "Commission and settlement",
        "Marketplace bookings add a 5% TTC platform fee to the partner TTC price after options and discounts. The initial amount is a 10% advance plus this 5% fee. The remaining 90% is due to the partner. Settlement timing and refund rules require an agreed partnership arrangement before live payments.",
      ],
      [
        "Conditions and complaints",
        "Partner conditions are reviewed before publication. The version accepted for a reservation remains attached to that reservation. Contact support with the booking reference for changes or complaints.",
      ],
    ],
  },
  reservation: {
    title: "Booking conditions",
    sections: [
      [
        "Reservation requests",
        "Submitting a request does not confirm availability. The partner reviews the request. Confirmation requires the partner’s approval and verified payment of the required advance and platform fee.",
      ],
      [
        "Prices and deposits",
        "The 10% advance is part of the partner service price. The 5% platform fee is added to that price. Both are calculated on the TTC price after options and discounts. The security deposit is separate. Fees are not charged again with the remaining balance.",
      ],
      [
        "Applicable conditions",
        "The partner identity, offer details and conditions must be reviewed before acceptance. The accepted version, acceptance date and client identity are retained with the reservation. Contact support to request changes or report a problem.",
      ],
    ],
  },
  terms: {
    title: "A clear start to your journey",
    sections: [
      [
        "About this preview",
        "KraCar is an intermediation platform for car rentals and tourism activities in Morocco. It connects travellers and residents with professional partners. The partner identified on the offer provides the service. KraCar manages discovery, booking coordination and access to documents.",
      ],
      [
        "Reservation requests",
        "Submitting the form creates a request, not a confirmed service. The provider must review availability, driver eligibility, route, and any special requirements. Any revised quote must be accepted before payment or confirmation.",
      ],
      [
        "Prices and deposits",
        "The 10% advance is part of the partner service price. The 5% platform fee is added to that price. Both are calculated on the TTC price after options and discounts. The security deposit is separate. Fees are not charged again with the remaining balance.",
      ],
      [
        "Eligibility and delivery",
        "Car requests require the driver to meet the selected plan’s minimum age and to have held a valid licence for at least one year. Exact pickup, delivery times, vehicle specifications, and provider conditions are reviewed before confirmation. Photography is illustrative.",
      ],
      [
        "Payments and confirmation",
        "Submitting a request does not confirm availability. The partner reviews the request. Confirmation requires the partner’s approval and verified payment of the required advance and platform fee.",
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
        "Rental accounts, reservations, payments and documents are stored in the configured PostgreSQL database. The activity catalogue and legacy management use MongoDB. Access is scoped to the client, relevant partner and authorised administrators. Production hosting, email delivery, payments and retention policies must be configured before launch.",
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
