"use client";
import SelectField from "./select-field";
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
    <div className="language-switcher">
      <SelectField
        label={t("Language")}
        value={t.locale}
        disabled={pending}
        busy={pending}
        compact
        icon={<Globe2 size={16} aria-hidden="true" />}
        options={[
          { value: "en", label: "English", lang: "en" },
          { value: "fr", label: "Français", lang: "fr" },
          { value: "ar", label: "العربية", lang: "ar" },
        ]}
        onChange={(value) => {
          if (!isLocale(value)) return;
          document.cookie = `atlas-locale=${value}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
          startTransition(() => router.refresh());
        }}
      />
    </div>
  );
}
