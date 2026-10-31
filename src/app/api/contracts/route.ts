import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { authorizedWorkspace } from "@/lib/workspace-auth";
import { clean, fail, originAllowed } from "@/lib/api";
import { contractSchema, contractQuote, returnSchema } from "@/lib/contracts";
import { today } from "@/lib/catalog";
import type { Contact, Vehicle, RentalContract, Invoice } from "@/lib/types";

async function context() {
  const user = await authorizedWorkspace();
  if (!user || user.role !== "agency") return null;
  const db = await getDb();
  await Promise.all([
    db.collection("contracts").createIndex({ id: 1 }, { unique: true }),
    db.collection("contracts").createIndex({ agencyId: 1, createdAt: -1 }),
    db.collection("contracts").createIndex(
      { agencyId: 1, number: 1 },
      {
        unique: true,
        partialFilterExpression: { number: { $type: "string" } },
      },
    ),
  ]);
  return { user, db, scope: { agencyId: user.agencyId } };
}
export async function GET() {
  try {
    const ctx = await context();
    if (!ctx) return fail("Active agency access required.", 403);
    return NextResponse.json(
      clean(
        await ctx.db
          .collection("contracts")
          .find(ctx.scope)
          .sort({ createdAt: -1 })
          .toArray(),
      ),
    );
  } catch {
    return fail("Contracts could not be loaded. Please retry.", 503);
  }
}
const command = z.object({
  action: z.enum(["save", "issue", "return", "void"]),
  id: z.uuid(),
  version: z.number().int().min(0),
});
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  try {
    const ctx = await context();
    if (!ctx) return fail("Active agency access required.", 403);
    const { db, scope, user } = ctx,
      body = await req.json(),
      { action, id, version } = command.parse(body),
      now = new Date().toISOString();
    const conflict = () =>
      fail(
        "This contract has changed. Refresh and reopen it before saving.",
        409,
      );
    if (action === "save") {
      const input = contractSchema.parse(body),
        quote = contractQuote(input.start, input.end, input.dailyRate);
      const [contact, vehicle, agency] = await Promise.all([
        db
          .collection<Contact>("contacts")
          .findOne({ id: input.contactId, ...scope, status: "active" }),
        db
          .collection<Vehicle>("vehicles")
          .findOne({ id: input.vehicleId, ...scope }),
        db.collection("agencies").findOne({ id: user.agencyId }),
      ]);
      if (!contact || !vehicle || !agency)
        return fail(
          "Choose an active customer and a vehicle belonging to your agency.",
        );
      if (input.bookingId) {
        const booking = await db
          .collection("bookings")
          .findOne({ id: input.bookingId, ...scope, category: "cars" });
        if (!booking)
          return fail("Choose a car reservation belonging to your agency.");
        if (vehicle.listingId && vehicle.listingId !== booking.listingId)
          return fail(
            "The vehicle does not match the selected reservation listing.",
          );
      }
      const invoice = input.invoiceId
        ? await db.collection<Invoice>("invoices").findOne({
            id: input.invoiceId,
            ...scope,
            contactId: input.contactId,
            currency: input.currency,
            status: { $ne: "void" },
          })
        : null;
      if (input.invoiceId && !invoice)
        return fail("Choose an invoice for this customer and currency.");
      const snapshot = {
        ...input,
        ...quote,
        customer: {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          address: contact.address,
        },
        vehicle: {
          name: vehicle.name,
          plate: vehicle.plate,
          year: vehicle.year,
        },
        issuer: {
          name: agency.name,
          email: agency.email,
          phone: agency.phone || "",
          registration: agency.registration || "",
          address: agency.billingAddress || agency.city,
          taxId: agency.taxId || "",
        },
        invoiceNumber: invoice?.number || "",
        updatedAt: now,
      };
      if (!version)
        await db.collection("contracts").insertOne({
          ...snapshot,
          ...scope,
          id,
          version: 1,
          status: "draft",
          createdAt: now,
        });
      else {
        const result = await db
          .collection("contracts")
          .updateOne(
            { id, ...scope, version, status: "draft" },
            { $set: snapshot, $inc: { version: 1 } },
          );
        if (!result.matchedCount) return conflict();
      }
    } else {
      const contract = await db
        .collection<RentalContract>("contracts")
        .findOne({ id, ...scope, version });
      if (!contract) return conflict();
      let changes: Record<string, unknown>;
      if (action === "issue") {
        if (contract.status !== "draft")
          return fail("Only a draft contract can be issued.", 409);
        const [contact, vehicle] = await Promise.all([
          db
            .collection("contacts")
            .findOne({ id: contract.contactId, ...scope, status: "active" }),
          db.collection("vehicles").findOne({
            id: contract.vehicleId,
            ...scope,
            status: { $ne: "inactive" },
          }),
        ]);
        if (!contact || !vehicle)
          return fail(
            "Restore the contract customer and vehicle before issuing.",
          );
        if (
          contract.invoiceId &&
          !(await db
            .collection("invoices")
            .findOne({
              id: contract.invoiceId,
              ...scope,
              contactId: contract.contactId,
              currency: contract.currency,
              status: { $ne: "void" },
            }))
        )
          return fail("Choose an invoice for this customer and currency.");
        const counter = await db
          .collection<{ _id: string; value: number }>("contract_counters")
          .findOneAndUpdate(
            { _id: `${user.agencyId}:${contract.start.slice(0, 4)}` },
            { $inc: { value: 1 } },
            { upsert: true, returnDocument: "after" },
          );
        changes = {
          status: "issued",
          number: `CTR-${contract.start.slice(0, 4)}-${String(counter!.value).padStart(5, "0")}`,
          issuedAt: now,
        };
      } else if (action === "return") {
        if (contract.status !== "issued")
          return fail("Only an issued contract can record a return.", 409);
        const returned = returnSchema.parse(body);
        if (returned.date < contract.start || returned.date > today())
          return fail("Choose a return date between pickup and today.");
        if (returned.mileage < contract.mileageOut)
          return fail("Return mileage cannot be below pickup mileage.");
        changes = { status: "returned", returned, returnedAt: now };
      } else {
        if (!["draft", "issued"].includes(contract.status))
          return fail("Only a draft or issued contract can be voided.", 409);
        changes = { status: "void", voidedAt: now };
      }
      const result = await db
        .collection("contracts")
        .updateOne(
          { id, ...scope, version, status: contract.status },
          { $set: { ...changes, updatedAt: now }, $inc: { version: 1 } },
        );
      if (!result.matchedCount) return conflict();
    }
    await db.collection("audit").insertOne({
      actor: user.id,
      ...scope,
      action: `contract.${action}`,
      recordId: id,
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (error instanceof z.ZodError)
      return fail(error.issues[0]?.message || "Check the form fields.");
    if (error instanceof RangeError) return fail(error.message);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      return fail(
        "This contract already exists. Refresh before trying again.",
        409,
      );
    return fail("The contract could not be saved. Please retry.", 503);
  }
}
