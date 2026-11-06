import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getTranslator } from "@/i18n/server";
import { guides } from "@/lib/travel-guides";
export default async function GuideCard({
  guide,
  headingLevel = 3,
}: {
  guide: (typeof guides)[number];
  headingLevel?: 2 | 3;
}) {
  const t = await getTranslator();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <Link href={`/article/${guide.slug}`} className="guide-card">
      <Image
        src={`/images/${guide.image}.jpg`}
        width={700}
        height={450}
        alt={t(guide.title)}
      />
      <div>
        <span className="eyebrow">{t("KraCar travel notes")}</span>
        <Heading>{t(guide.title)}</Heading>
        <p>{t(guide.intro)}</p>
        <span className="text-link">
          {t("Read the guide")}
          <ArrowUpRight aria-hidden="true" focusable="false" size={15} />
        </span>
      </div>
    </Link>
  );
}
