import { localizeMetadata, getTranslator } from "@/i18n/server";
import PublicShell from "@/components/public-shell";
import PartnerForm from "@/components/partner-form";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  Compass,
  ClipboardCheck,
  Settings2,
  Headphones,
} from "lucide-react";
export async function generateMetadata() {
  return localizeMetadata({ title: "Grow with Atlas" });
}
export default async function Partners() {
  const t = await getTranslator();
  const benefits = [
    {
      icon: ClipboardCheck,
      title: "Requests in one place",
      text: "Review trip details, manage availability and follow each reservation from your workspace.",
    },
    {
      icon: Settings2,
      title: "Your services, your control",
      text: "Manage your listings and approve the journeys that work for your business.",
    },
    {
      icon: Headphones,
      title: "A team alongside you",
      text: "Keep traveler requests and platform support connected as your business grows.",
    },
  ];
  return (
    <PublicShell>
      <main tabIndex={-1} id="main-content" className="partner-landing">
        <section className="partner-intro">
          <div className="public-container">
            <div className="eyebrow">
              {t("Local businesses. Shared journeys.")}
            </div>
            <h1>{t("Bring your business to Atlas")}</h1>
            <p>
              {t(
                "Connect your local expertise with travelers exploring Morocco. Apply to offer car rentals or memorable local experiences.",
              )}
            </p>
            <div className="row">
              <a href="#apply" className="button large">
                {t("Start your application")}
                <ArrowRight aria-hidden="true" focusable="false" size={16} />
              </a>
              <Link href="/login" className="button secondary">
                {t("Partner sign in")}
              </Link>
            </div>
          </div>
        </section>
        <section className="public-container partner-section">
          <div className="section-title">
            <h2>{t("A calmer way to do business")}</h2>
            <p>{t("Practical tools for the people who know Morocco best.")}</p>
          </div>
          <div className="partner-benefits">
            {benefits.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <span className="feature-icon">
                  <Icon aria-hidden="true" focusable="false" size={24} />
                </span>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="partner-services">
          <div className="public-container">
            <div className="section-title">
              <h2>{t("Find your place on the platform")}</h2>
              <p>
                {t(
                  "Car rentals and local experiences, built around your expertise.",
                )}
              </p>
            </div>
            <div className="partner-service-grid">
              {[
                {
                  icon: CarFront,
                  title: "Car rentals",
                  text: "City cars, family vehicles and room for longer adventures.",
                },
                {
                  icon: Compass,
                  title: "Things to do",
                  text: "Guided discoveries, outdoor adventures and local experiences.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <article className="card" key={title}>
                  <Icon aria-hidden="true" focusable="false" size={21} />
                  <h3>{t(title)}</h3>
                  <p>{t(text)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="public-container partner-section">
          <div className="section-title">
            <h2>{t("From introduction to your first journey")}</h2>
            <p>
              {t("A clear process, with a person reviewing your application.")}
            </p>
          </div>
          <ol className="onboarding-steps">
            {[
              {
                title: "Introduce your business",
                text: "Share your services, contact details and commercial registration document.",
              },
              {
                title: "Complete the review",
                text: "Our platform team checks your application and follows up with you.",
              },
              {
                title: "Set up your workspace",
                text: "After approval, agree terms with the team and receive your manager access.",
              },
              {
                title: "Welcome your travelers",
                text: "Publish your services and manage incoming reservation requests.",
              },
            ].map((s, i) => (
              <li key={s.title}>
                <span>{new Intl.NumberFormat(t.locale).format(i + 1)}</span>
                <div>
                  <h3>{t(s.title)}</h3>
                  <p>{t(s.text)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section id="apply" className="application-section">
          <div className="section-title">
            <span className="eyebrow">
              <BadgeCheck aria-hidden="true" focusable="false" size={16} />
              {t("Become a partner")}
            </span>
            <h2>{t("Let’s meet your business")}</h2>
            <p>
              {t(
                "Tell us about your services. Our team will review the details before setting up your agency.",
              )}
            </p>
          </div>
          <PartnerForm />
        </section>
        <section className="partner-contact">
          <h2>{t("A question before you apply?")}</h2>
          <p>
            {t(
              "Talk to the platform team about your business and the next steps.",
            )}
          </p>
          <Link href="/support" className="button secondary">
            {t("Help & support")}
            <ArrowRight aria-hidden="true" focusable="false" size={16} />
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
