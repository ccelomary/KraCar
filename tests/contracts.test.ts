import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contractQuote,
  contractSchema,
  returnSchema,
} from "../src/lib/contracts";

test("contract rental totals use calendar intervals and integer cents", () => {
  assert.deepEqual(contractQuote("2027-03-26", "2027-03-30", 19999), {
    days: 4,
    total: 79996,
  });
  assert.deepEqual(contractQuote("2026-12-31", "2027-01-01", 120000), {
    days: 1,
    total: 120000,
  });
  for (const [start, end, rate] of [
    ["bad", "2026-11-01", 100],
    ["2026-11-01", "2026-11-01", 100],
    ["2026-11-02", "2026-11-01", 100],
    ["2026-01-01", "2028-01-01", 100],
    ["2026-11-01", "2026-11-02", 0],
    ["2026-11-01", "2026-11-02", 1.5],
  ] as const)
    assert.throws(() => contractQuote(start, end, rate));
});
test("contract validation requires identified parties, dates, condition and agency terms", () => {
  const c = {
    contactId: "d24619ba-39cf-4d4b-8a78-3ed28ad20052",
    vehicleId: "a49b7101-3fd5-4696-a274-e1911ee28b63",
    bookingId: "",
    invoiceId: "",
    driverName: "QA Driver",
    driverLicence: "QA-LICENCE",
    start: "2026-10-28",
    end: "2026-10-31",
    pickupTime: "10:00",
    returnTime: "10:00",
    pickupLocation: "QA pickup",
    returnLocation: "QA return",
    currency: "MAD",
    dailyRate: 120000,
    deposit: 200000,
    mileageOut: 50000,
    fuelOut: "full",
    conditionOut: "QA condition",
    terms: "QA agreed rental terms.",
    notes: "",
  };
  assert.ok(contractSchema.safeParse(c).success);
  for (const change of [
    { end: c.start },
    { driverLicence: "" },
    { terms: "" },
    { deposit: -1 },
    { pickupTime: "25:00" },
    { mileageOut: -1 },
    { dailyRate: 10.5 },
  ])
    assert.ok(!contractSchema.safeParse({ ...c, ...change }).success);
  assert.ok(
    returnSchema.safeParse({
      date: "2026-10-30",
      mileage: 50200,
      fuel: "half",
      condition: "QA return condition",
    }).success,
  );
  assert.ok(
    !returnSchema.safeParse({
      date: "bad",
      mileage: 50200,
      fuel: "full",
      condition: "",
    }).success,
  );
});
