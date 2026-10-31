import { getTranslator } from "@/i18n/server";
import Link from "next/link";
export default async function NotFound() {
  const t = await getTranslator();
  return (
    <main tabIndex={-1} id="main-content" className="app-error">
      <div className="eyebrow">{t("404 \u00B7 A different turn")}</div>
      <h1>{t("This road doesn\u2019t lead anywhere.")}</h1>
      <p className="muted">
        {t("Let\u2019s get you back to something worth exploring.")}
      </p>
      <Link href="/" className="button">
        {t("Back to Atlas")}
      </Link>
    </main>
  );
}
