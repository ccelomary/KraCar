import { test } from "node:test";
import assert from "node:assert/strict";
import {
  invoiceTotal,
  invoiceState,
  invoiceSchema,
  vehicleAttention,
  vehicleSchema,
} from "../src/lib/management";

test("invoice calculations use integer cents and reject empty or excessive totals", () => {
  assert.equal(
    invoiceTotal([
      { quantity: 3, unitPrice: 1999 },
      { quantity: 2, unitPrice: 350 },
    ]),
    6697,
  );
  assert.throws(() => invoiceTotal([{ quantity: 1, unitPrice: 0 }]));
  assert.throws(() =>
    invoiceTotal([{ quantity: 10000, unitPrice: 100000000 }]),
  );
});
test("invoice state preserves drafts and voids and handles partial payments and overdue balances", () => {
  const i = { status: "issued", dueDate: "2026-11-01", total: 10000, paid: 0 };
  assert.equal(invoiceState(i, "2026-11-01"), "issued");
  assert.equal(
    invoiceState({ ...i, paid: 2000 }, "2026-11-01"),
    "partially_paid",
  );
  assert.equal(invoiceState({ ...i, paid: 2000 }, "2026-11-02"), "overdue");
  assert.equal(invoiceState({ ...i, paid: 10000 }, "2026-11-02"), "paid");
  assert.equal(invoiceState({ ...i, status: "draft" }, "2026-11-02"), "draft");
  assert.equal(invoiceState({ ...i, status: "void" }, "2026-11-02"), "void");
});
test("invoice validation rejects fractional quantities and inverted due dates", () => {
  const i = {
    contactId: "a",
    bookingId: "",
    issueDate: "2026-11-01",
    dueDate: "2026-11-02",
    currency: "EUR",
    notes: "",
    items: [{ description: "Rental", quantity: 1, unitPrice: 100 }],
  };
  assert.ok(invoiceSchema.safeParse(i).success);
  assert.ok(!invoiceSchema.safeParse({ ...i, dueDate: "2026-10-30" }).success);
  assert.ok(
    !invoiceSchema.safeParse({
      ...i,
      items: [{ ...i.items[0], quantity: 1.5 }],
    }).success,
  );
});
test("fleet reminders cover dates and mileage without treating unset reminders as overdue", () => {
  const v = {
    insuranceDue: "",
    serviceDue: "",
    serviceMileage: 0,
    mileage: 50000,
  };
  assert.deepEqual(vehicleAttention(v, "2026-11-01"), []);
  assert.deepEqual(
    vehicleAttention(
      { ...v, insuranceDue: "2026-11-01", serviceMileage: 50000 },
      "2026-11-01",
    ),
    ["Insurance due", "Service due"],
  );
  assert.deepEqual(
    vehicleAttention({ ...v, serviceDue: "2026-10-31" }, "2026-11-01"),
    ["Service due"],
  );
  assert.ok(
    !vehicleSchema.safeParse({
      ...v,
      name: "Car",
      plate: "xx",
      listingId: "",
      city: "Fes",
      year: 2024,
      status: "available",
      notes: "",
      mileage: -1,
    }).success,
  );
});
