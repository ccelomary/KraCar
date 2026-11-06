import { localizeMetadata } from "@/i18n/server";

import "./globals.css";
import "./journey.css";
import "./market.css";
import "./calendar.css";
import "./select.css";
import "./brand.css";
import { getLocaleData } from "@/i18n/server";
import { createTranslator } from "@/i18n/core";
import { LocaleProvider } from "@/i18n/provider";
import { SiteDateProvider } from "@/components/site-date";
import { moroccoToday } from "@/lib/rental-calendar";
export async function generateMetadata() {
  return localizeMetadata({
    title: {
      default: "KraCar — Voitures & expériences au Maroc",
      template: "%s · KraCar",
    },
    description:
      "Location de voitures et activités touristiques auprès de professionnels au Maroc. Avance de 10 %, frais de service de 5 %, conditions et suivi dans un espace unique.",
  });
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, messages } = await getLocaleData();
  const t = createTranslator(locale, messages);
  const today = moroccoToday();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <LocaleProvider locale={locale} messages={messages}>
          <SiteDateProvider today={today}>
            <a href="#main-content" className="skip-link">
              {t("Skip to content")}
            </a>
            {children}
          </SiteDateProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
