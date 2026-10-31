export const locales = ["en", "fr", "ar"] as const;
export type Locale = (typeof locales)[number];
export type Messages = Record<string, string>;
export const localeTags: Record<Locale, string> = {
  en: "en-GB",
  fr: "fr-MA",
  ar: "ar-MA",
};
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}
export function resolveLocale(saved: unknown, acceptLanguage = ""): Locale {
  if (isLocale(saved)) return saved;
  const candidates = acceptLanguage
    .split(",")
    .map((entry, index) => {
      const [tag, quality] = entry.trim().split(";");
      return {
        language: tag.toLowerCase().split("-")[0],
        quality: quality?.startsWith("q=") ? Number(quality.slice(2)) : 1,
        index,
      };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  const supported = candidates.find((entry) => isLocale(entry.language));
  return supported && isLocale(supported.language) ? supported.language : "en";
}
export function createTranslator(locale: Locale, messages: Messages) {
  const translate = (
    message: string,
    values?: Record<string, string | number>,
  ) => {
    const trimmed = message.trim();
    const translated =
      messages[message] ??
      (messages[trimmed] !== undefined
        ? message.replace(trimmed, messages[trimmed])
        : message);
    return values
      ? translated.replace(/\{(\w+)\}/g, (match, key) => {
          const value = values[key];
          return value === undefined
            ? match
            : typeof value === "number"
              ? new Intl.NumberFormat(localeTags[locale]).format(value)
              : value;
        })
      : translated;
  };
  return Object.assign(translate, { locale, tag: localeTags[locale] });
}
