"use client";
import { useTranslations } from "@/i18n/provider";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations();
  return (
    <main tabIndex={-1} id="main-content" className="app-error">
      <h1>{t("A small detour.")}</h1>
      <p className="muted">
        {t(
          "We couldn\u2019t load this page. Please check your connection and try again.",
        )}
      </p>
      <button className="button" onClick={reset}>
        {t("Try again")}
      </button>
    </main>
  );
}
