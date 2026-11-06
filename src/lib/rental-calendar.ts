const dayMs = 86400000;
export function dateAtNoon(day: string) {
  return new Date(`${day.slice(0, 10)}T12:00:00Z`);
}
export function isCalendarDate(day: string) {
  const date = dateAtNoon(day);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(+date) &&
    date.toISOString().slice(0, 10) === day
  );
}
export function addCalendarDays(day: string, count: number) {
  return new Date(+dateAtNoon(day) + count * dayMs).toISOString().slice(0, 10);
}
export function shiftCalendarMonth(day: string, count: number) {
  const date = dateAtNoon(day);
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1, 12),
  );
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), last));
  return target.toISOString().slice(0, 10);
}
export function calendarDays(month: string) {
  const first = `${month.slice(0, 7)}-01`;
  const offset = (dateAtNoon(first).getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) =>
    addCalendarDays(first, index - offset),
  );
}
export function moroccoToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join("-");
}
export function moroccoNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((value) => value.type === type)!.value;
  return (
    part("year") +
    "-" +
    part("month") +
    "-" +
    part("day") +
    "T" +
    part("hour") +
    ":" +
    part("minute")
  );
}
export function defaultRentalDateTime(days: number, today = moroccoToday()) {
  return `${addCalendarDays(today, days)}T10:00`;
}
export function nextRentalMinute(value: string) {
  const date = new Date(`${value}:00Z`);
  return Number.isFinite(+date)
    ? new Date(+date + 60000).toISOString().slice(0, 16)
    : undefined;
}
export function keepReturnAfterPickup(start: string, end: string) {
  return end > start
    ? end
    : `${addCalendarDays(start, 3)}T${start.slice(11, 16)}`;
}
