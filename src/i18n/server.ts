import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Metadata } from "next";
import { createTranslator, resolveLocale, type Messages } from "./core";
const dictionaries = {
  fr: () => import("./messages/fr.json").then((module) => module.default),
  ar: () => import("./messages/ar.json").then((module) => module.default),
};
export const getLocaleData = cache(async () => {
  const saved = (await cookies()).get("atlas-locale")?.value;
  const locale = resolveLocale(
    saved,
    (await headers()).get("accept-language") || "",
  );
  const messages: Messages =
    locale === "en" ? {} : await dictionaries[locale]();
  return { locale, messages };
});
export async function getTranslator() {
  const { locale, messages } = await getLocaleData();
  return createTranslator(locale, messages);
}
export async function localizeMetadata(metadata: Metadata): Promise<Metadata> {
  const t = await getTranslator();
  const title = metadata.title;
  return {
    ...metadata,
    description: metadata.description
      ? t(metadata.description)
      : metadata.description,
    title:
      typeof title === "string"
        ? t(title)
        : title
          ? {
              ...title,
              ...("default" in title ? { default: t(title.default) } : {}),
              ...("absolute" in title ? { absolute: t(title.absolute) } : {}),
            }
          : title,
  };
}
