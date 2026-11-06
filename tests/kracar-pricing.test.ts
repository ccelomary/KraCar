import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rentalQuote,
  tierFee,
  canTransition,
  assertBalanced,
  periodsOverlap,
} from "../src/lib/kracar/pricing";
const v = {
  dailyRate: 40000,
  deposit: 500000,
  weeklyDiscount: 1000,
  monthlyRate: 900000,
  extras: [
    { id: "seat", name: "Child seat", price: 3000, perDay: true, max: 2 },
  ],
  rules: [],
};
const start = new Date("2027-01-01T10:00:00Z");
test("KraCar fee boundaries round to whole MAD and retain three-day downward jumps", () => {
  assert.equal(tierFee(49999), 22500);
  assert.equal(tierFee(50000), 15000);
  assert.equal(tierFee(99999), 30000);
  assert.equal(tierFee(100000), 24000);
  assert.equal(tierFee(10001), 4600);
});
test("quote precedence, duration discounts, extras and deposits remain deterministic", () => {
  const q = rentalQuote(v, start, new Date(+start + 7 * 86400000), { seat: 1 });
  assert.equal(q.subtotal, 280000);
  assert.equal(q.discount, 28000);
  assert.equal(q.extras, 21000);
  assert.equal(q.total, 286650);
  assert.equal(q.deposit, 500000);
  assert.equal(q.prepayment, 40950);
  assert.equal(q.balance, 245700);
  assert.equal(q.agencyCommission, 0);
  const m = rentalQuote(v, start, new Date(+start + 30 * 86400000));
  assert.equal(m.total, 945000);
  const rule = {
    id: "a",
    priority: 2,
    start,
    end: new Date(+start + 86400000),
    dailyRate: 60000,
  };
  const s = rentalQuote(
    {
      ...v,
      rules: [{ ...rule, id: "b", priority: 1, dailyRate: 80000 }, rule],
    },
    start,
    new Date(+start + 86400000 + 1),
  );
  assert.deepEqual(s.dailyRates, [60000, 40000]);
  assert.equal(s.days, 2);
  assert.throws(() => rentalQuote(v, start, start));
  assert.throws(() =>
    rentalQuote(v, start, new Date(+start + 86400000), { seat: 3 }),
  );
});
test("inventory adjacency and terminal transitions are explicit; financial events balance", () => {
  assert.equal(
    periodsOverlap(
      start,
      new Date(+start + 1000),
      new Date(+start + 1000),
      new Date(+start + 2000),
    ),
    false,
  );
  assert.equal(canTransition("requested", "completed"), false);
  assert.equal(canTransition("approved", "in_progress"), true);
  assert.equal(canTransition("completed", "approved"), false);
  assertBalanced([
    { account: "cash", amount: 1234 },
    { account: "rental", amount: -1234 },
  ]);
  assert.throws(() =>
    assertBalanced([
      { account: "cash", amount: 1234 },
      { account: "rental", amount: -1200 },
    ]),
  );
});
