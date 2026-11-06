import { test } from "node:test";
import assert from "node:assert/strict";
import { rentalQuote, defaultFees } from "../src/lib/kracar/pricing";
import { contractualVersion } from "../src/lib/kracar/terms";
const start = new Date("2027-01-01T10:00:00Z");
const end = new Date("2027-01-02T10:00:00Z");
const car = {
  dailyRate: 200000,
  deposit: 500000,
  weeklyDiscount: 0,
  monthlyRate: null,
  extras: [],
  rules: [],
};
test("2,000 MAD service separates advance, platform fee, initial payment, balance and caution", () => {
  const q = rentalQuote(car, start, end);
  assert.equal(q.partnerTotal, 200000);
  assert.equal(q.advance, 20000);
  assert.equal(q.serviceFee, 10000);
  assert.equal(q.prepayment, 30000);
  assert.equal(q.total, 210000);
  assert.equal(q.balance, 180000);
  assert.equal(q.deposit, 500000);
  assert.equal(q.total, q.prepayment + q.balance);
});
test("commission applies after discounts, options and configured taxes, with cent rounding", () => {
  const q = rentalQuote(
    {
      ...car,
      dailyRate: 10001,
      weeklyDiscount: 1000,
      extras: [
        { id: "option", name: "Option", price: 1003, perDay: false, max: 1 },
      ],
    },
    start,
    new Date(+start + 7 * 86400000),
    { option: 1 },
    { ...defaultFees, taxBps: 2000 },
  );
  assert.equal(q.partnerTotal, q.subtotal - q.discount + q.extras);
  assert.equal(q.taxes, Math.round((q.partnerTotal * 2000) / 12000));
  assert.equal(q.serviceFee, Math.round(q.partnerTotal * 0.05));
  assert.equal(q.advance, Math.round(q.partnerTotal * 0.1));
  assert.equal(q.prepayment + q.balance, q.total);
  assert.equal(q.balance, q.partnerTotal - q.advance);
});
test("direct and B2B bookings do not acquire marketplace fees or an advance", () => {
  const q = rentalQuote(
    car,
    start,
    end,
    {},
    { ...defaultFees, marketplace: false },
  );
  assert.equal(q.serviceFee, 0);
  assert.equal(q.advance, 0);
  assert.equal(q.prepayment, 0);
  assert.equal(q.balance, 200000);
});
test("terms identifiers ignore field order and review metadata but detect changed clauses", () => {
  assert.equal(
    contractualVersion(
      { fr: "Clauses", _status: "pending" },
      { age: "21", fuel: "full" },
    ),
    contractualVersion(
      { _status: "approved", fr: "Clauses" },
      { fuel: "full", age: "21" },
    ),
  );
  assert.notEqual(
    contractualVersion({ fr: "Old" }, {}),
    contractualVersion({ fr: "New" }, {}),
  );
});
