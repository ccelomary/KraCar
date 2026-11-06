import PublicShell from "@/components/public-shell";
import { guides } from "@/lib/travel-guides";
import { getTranslator, localizeMetadata } from "@/i18n/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);
  return localizeMetadata({ title: guide?.title || "KraCar travel notes" });
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) notFound();
  const t = await getTranslator();
  return (
    <PublicShell>
      <main
        id="main-content"
        className="public-container info-page article-page"
      >
        <nav className="breadcrumb" aria-label={t("Breadcrumb")}>
          <Link href="/blog">{t("KraCar travel notes")}</Link>
          <span aria-hidden="true">/</span>
          <span>{t(guide.title)}</span>
        </nav>
        <article>
          <header className="section-title">
            <span className="eyebrow">{t("KraCar travel notes")}</span>
            <h1>{t(guide.title)}</h1>
            <p>{t(guide.intro)}</p>
          </header>
          <Image
            className="article-image"
            src={`/images/${guide.image}.jpg`}
            width={1100}
            height={600}
            alt={t(guide.title)}
            priority
          />
          <div className="article-copy">
            {guide.sections.map((section) => (
              <section key={section.title}>
                <h2>{t(section.title)}</h2>
                <p>{t(section.text)}</p>
              </section>
            ))}
          </div>
        </article>
        <div className="info-help">
          <h2>{t("Find your next journey")}</h2>
          <Link className="button" href={`/explore?category=${guide.category}`}>
            {t("Explore Morocco")}
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
