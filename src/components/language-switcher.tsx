"use client";
import { Globe2 } from "lucide-react";
import { isLocale } from "@/i18n/core";
import { useTranslations } from "@/i18n/provider";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export default function LanguageSwitcher() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="language-switcher">
      <Globe2 size={15} aria-hidden="true" />
      <span className="sr-only">{t("Language")}</span>
      <select
        aria-label={t("Language")}
        value={t.locale}
        disabled={pending}
        aria-busy={pending}
        onChange={(event) => {
          if (!isLocale(event.target.value)) return;
          document.cookie = `atlas-locale=${event.target.value}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
          startTransition(() => router.refresh());
        }}
      >
        <option value="en" lang="en">
          English
        </option>
        <option value="fr" lang="fr">
          Français
        </option>
        <option value="ar" lang="ar">
          العربية
        </option>
      </select>
    </label>
  );
}
