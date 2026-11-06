import { Temporal } from "@js-temporal/polyfill";
export function rentalInstant(local: string) {
  const value = Temporal.PlainDateTime.from(local).toZonedDateTime(
    "Africa/Casablanca",
    { disambiguation: "reject" },
  );
  return value.toInstant().toString();
}
export function rentalLocal(instant: string) {
  return Temporal.Instant.from(instant)
    .toZonedDateTimeISO("Africa/Casablanca")
    .toPlainDateTime()
    .toString({ smallestUnit: "minute" });
}
export function mad(amount: number, locale = "fr-MA") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "MAD",
  }).format(amount / 100);
}
