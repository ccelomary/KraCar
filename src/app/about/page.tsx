import PublicShell from "@/components/public-shell";
import { getTranslator, localizeMetadata } from "@/i18n/server";
import Image from "next/image";
import Link from "next/link";
export async function generateMetadata() {
  return localizeMetadata({ title: "About Atlas" });
}
export default async function About() {
  const t = await getTranslator();
  return (
    <PublicShell>
      <main
        tabIndex={-1}
        id="main-content"
        className="public-container info-page"
      >
        <div className="section-title">
          <span className="eyebrow">
            {t("Local businesses. Shared journeys.")}
          </span>
          <h1>{t("A little closer to Morocco")}</h1>
          <p>
            {t(
              "One place to plan the road, the coast and everything in between.",
            )}
          </p>
        </div>
        <div className="about-feature">
          <Image
            src="/images/atlas-road.jpg"
            alt={t("Winding road through the Moroccan Atlas Mountains")}
            width={900}
            height={600}
          />
          <div>
            <h2>{t("Local people, local knowledge")}</h2>
            <p>
              {t(
                "Discover services from providers who know the places you want to explore.",
              )}
            </p>
            <p>
              {t(
                "Compare the details, inclusions and conditions before making a request.",
              )}
            </p>
            <Link href="/explore" className="button">
              {t("Explore Morocco")}
            </Link>
          </div>
        </div>
        <div className="info-help">
          <h2>{t("Bring your business to Atlas")}</h2>
          <Link href="/partners" className="button secondary">
            {t("Become a partner")}
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
