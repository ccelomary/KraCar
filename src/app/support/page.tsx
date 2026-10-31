import { localizeMetadata } from "@/i18n/server";
import { getTranslator } from "@/i18n/server";
import PublicShell from "@/components/public-shell";
import SupportForm from "@/components/support-form";
import { LifeBuoy, ShieldCheck, CalendarDays } from "lucide-react";
export async function generateMetadata() {
  return localizeMetadata({ title: "A little help for your journey" });
}
export default async function Support() {
  const t = await getTranslator();
  return (
    <PublicShell>
      <main tabIndex={-1} id="main-content" className="public-container">
        <div className="support-layout">
          <section>
            <div className="eyebrow">{t("People, here for people")}</div>
            <h1>
              {t("A little help")}
              <br />
              {t("goes a long way.")}
            </h1>
            <p>
              {t(
                "A question before you set off? A change of plans? Tell us what you need and we\u2019ll help you find your next step.",
              )}
            </p>
            <div className="stack" style={{ marginTop: "2rem" }}>
              {[
                {
                  icon: LifeBuoy,
                  title: "Before you book",
                  text: "Understand an experience, provider, or booking condition.",
                },
                {
                  icon: CalendarDays,
                  title: "A change of plans",
                  text: "Include your reservation reference so we can help faster.",
                },
                {
                  icon: ShieldCheck,
                  title: "A clear answer",
                  text: "Your message goes straight to our platform support inbox.",
                },
              ].map((x) => (
                <div className="row" key={x.title}>
                  <div className="empty-icon">
                    <x.icon aria-hidden="true" focusable="false" size={21} />
                  </div>
                  <div>
                    <h2>{t(x.title)}</h2>
                    <p style={{ fontSize: ".75rem", margin: ".25rem 0" }}>
                      {t(x.text)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <SupportForm />
        </div>
        <section style={{ maxWidth: "50rem", margin: "0 auto 4rem" }}>
          <div className="section-head">
            <div>
              <div className="eyebrow">{t("A few useful answers")}</div>
              <h2>{t("Good to know before you go.")}</h2>
            </div>
          </div>
          {[
            {
              q: "Does sending a request confirm my trip?",
              a: "Your request is the first step. Your provider reviews availability and the details. Approval and any required payment must be coordinated before your trip is confirmed.",
            },
            {
              q: "Do I need an account to make a reservation?",
              a: "No. Send a request as a guest, then save your private booking link to access your reservation and see its status.",
            },
            {
              q: "Can I change or cancel my request?",
              a: "You can cancel a pending request using its private booking link. For changes or a confirmed reservation, contact support with your reference. Any applicable conditions depend on the accepted provider quote.",
            },
            {
              q: "What currency are prices in?",
              a: "All displayed prices are in euros. Car prices are per day and activities per person unless the listing says otherwise.",
            },
          ].map((f) => (
            <details className="faq" key={f.q}>
              <summary>{t(f.q)}</summary>
              <p>{t(f.a)}</p>
            </details>
          ))}
        </section>
      </main>
    </PublicShell>
  );
}
