import { getTranslator } from "@/i18n/server";
export default async function Loading() {
  const t = await getTranslator();
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-busy="true"
      className="loading-page"
      aria-label={t("Loading page")}
    >
      <div className="skeleton" style={{ height: "4rem" }} />
      <div className="skeleton" style={{ height: "20rem" }} />
      <span className="sr-only">{t("Preparing your journey\u2026")}</span>
    </main>
  );
}
