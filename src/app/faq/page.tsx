import PublicShell from "@/components/public-shell";
import { getTranslator, localizeMetadata } from "@/i18n/server";
import { faqGroups } from "@/lib/public-content";
import Link from "next/link";
export async function generateMetadata() {
  return localizeMetadata({ title: "Common questions" });
}
export default async function FAQ() {
  const t = await getTranslator();
  return (
    <PublicShell>
      <main
        tabIndex={-1}
        id="main-content"
        className="public-container info-page"
      >
        <div className="section-title">
          <span className="eyebrow">{t("Here to help")}</span>
          <h1>{t("Common questions")}</h1>
          <p>{t("Clear answers before you make your plans.")}</p>
        </div>
        <div className="faq-section">
          {faqGroups.map((group) => (
            <section key={group.title}>
              <h2>{t(group.title)}</h2>
              {group.items.map((item) => (
                <details key={item.question}>
                  <summary>{t(item.question)}</summary>
                  <p>{t(item.answer)}</p>
                </details>
              ))}
            </section>
          ))}
        </div>
        <div className="info-help">
          <h2>{t("A question about your trip?")}</h2>
          <Link href="/support" className="button">
            {t("Help & support")}
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
