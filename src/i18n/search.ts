import { localeTags, type Locale } from "./core";
function normalize(value: string, locale: Locale) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase(localeTags[locale]);
}
export function matchesSearch(query: string, values: string[], locale: Locale) {
  const needle = normalize(query.trim(), locale);
  return values.some((value) => normalize(value, locale).includes(needle));
}
