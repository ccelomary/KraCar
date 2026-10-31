import { test } from "node:test";
import assert from "node:assert/strict";
import { quote, transitions, yearsOnDate } from "../src/lib/pricing";
import { seedListings } from "../src/lib/catalog";
test("driver eligibility respects the actual birthday and licence anniversary", () => {
  assert.equal(yearsOnDate("2003-11-02", "2026-11-01"), 22);
  assert.equal(yearsOnDate("2003-11-02", "2026-11-02"), 23);
  assert.equal(yearsOnDate("2025-11-02", "2026-11-01"), 0);
});
test("rental quote adds cover and seats in integer cents and separates deposit", () => {
  const result = quote(
    seedListings[0],
    "2026-11-01",
    "2026-11-05",
    "comfort",
    1,
  );
  assert.equal(result.days, 4);
  assert.equal(result.total, 24800);
  assert.equal(result.deposit, 50000);
});
test("calendar billing remains four days across a daylight-saving boundary", () => {
  assert.equal(quote(seedListings[0], "2027-03-26", "2027-03-30").days, 4);
});
test("activity prices multiply guests, not duration or car cover", () => {
  const result = quote(
    seedListings.find((l) => l.id === "taghazout-surf")!,
    "2026-11-01",
    "2026-11-05",
    "comfort",
    1,
    3,
  );
  assert.equal(result.total, 13500);
  assert.equal(result.deposit, 0);
});
test("invalid dates, protection, capacity and excessive duration are rejected", () => {
  assert.throws(() => quote(seedListings[0], "2026-11-05", "2026-11-01"));
  assert.throws(() => quote(seedListings[0], "bad", "bad"));
  assert.throws(() =>
    quote(seedListings[0], "2026-11-01", "2026-11-05", "free"),
  );
  assert.throws(() =>
    quote(seedListings[0], "2026-11-01", "2026-11-05", "essential", 0, 6),
  );
  assert.throws(() => quote(seedListings[0], "2026-01-01", "2026-11-05"));
});
test("approval cannot directly confirm a booking or revive cancelled trips", () => {
  assert.deepEqual(transitions.requested, [
    "awaiting_payment",
    "declined",
    "cancelled",
  ]);
  assert.ok(!transitions.awaiting_payment.includes("confirmed"));
  assert.deepEqual(transitions.cancelled, []);
});
