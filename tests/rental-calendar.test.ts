import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addCalendarDays,
  calendarDays,
  dateAtNoon,
  isCalendarDate,
  keepReturnAfterPickup,
  nextRentalMinute,
  shiftCalendarMonth,
} from "../src/lib/rental-calendar";
test("calendar arithmetic clamps leap years and crosses month/year boundaries", () => {
  assert.equal(shiftCalendarMonth("2027-01-31", 1), "2027-02-28");
  assert.equal(shiftCalendarMonth("2028-01-31", 1), "2028-02-29");
  assert.equal(shiftCalendarMonth("2027-01-31", -1), "2026-12-31");
  assert.equal(addCalendarDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addCalendarDays("2027-02-28", 1), "2027-03-01");
  assert.equal(nextRentalMinute("2026-12-31T23:59"), "2027-01-01T00:00");
  assert.equal(isCalendarDate("2027-02-29"), false);
  assert.equal(isCalendarDate("2028-02-29"), true);
});
test("calendar grids have six distinct Monday-first weeks with adjacent month context", () => {
  const days = calendarDays("2028-02");
  assert.equal(days.length, 42);
  assert.equal(new Set(days).size, 42);
  assert.equal(dateAtNoon(days[0]).getUTCDay(), 1);
  assert.ok(days.includes("2028-02-29"));
  assert.ok(days[0] < "2028-02-01");
  assert.ok(days.at(-1)! > "2028-02-29");
});
test("pickup edits preserve valid returns and move invalid returns forward without changing time", () => {
  assert.equal(
    keepReturnAfterPickup("2027-03-03T10:00", "2027-03-06T11:30"),
    "2027-03-06T11:30",
  );
  assert.equal(
    keepReturnAfterPickup("2027-03-10T14:15", "2027-03-06T11:30"),
    "2027-03-13T14:15",
  );
  assert.equal(
    keepReturnAfterPickup("2027-03-10T14:15", "2027-03-10T14:15"),
    "2027-03-13T14:15",
  );
});
