import PublicShell from "@/components/public-shell";
import GuideCard from "@/components/guide-card";
import { guides } from "@/lib/travel-guides";
import { getTranslator, localizeMetadata } from "@/i18n/server";
export async function generateMetadata() {
  return localizeMetadata({ title: "Atlas travel notes" });
}
export default async function Blog() {
  const t = await getTranslator();
  return (
    <PublicShell>
      <main
        tabIndex={-1}
        id="main-content"
        className="public-container info-page"
      >
        <div className="section-title">
          <span className="eyebrow">{t("Explore Morocco")}</span>
          <h1>{t("Atlas travel notes")}</h1>
          <p>
            {t(
              "A little inspiration and practical thinking for your next journey.",
            )}
          </p>
        </div>
        <div className="guide-grid">
          {guides.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} headingLevel={2} />
          ))}
        </div>
      </main>
    </PublicShell>
  );
}
