import { localizeMetadata } from "@/i18n/server";

import "./globals.css";
import { getLocaleData } from "@/i18n/server";
import { createTranslator } from "@/i18n/core";
import { LocaleProvider } from "@/i18n/provider";
export async function generateMetadata() {
  return localizeMetadata({
    title: {
      default: "Atlas Journeys — Morocco, at your own pace",
      template: "%s · Atlas Journeys",
    },
    description: "Discover car rentals and local experiences across Morocco.",
  });
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, messages } = await getLocaleData();
  const t = createTranslator(locale, messages);
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <LocaleProvider locale={locale} messages={messages}>
          <a href="#main-content" className="skip-link">
            {t("Skip to content")}
          </a>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
