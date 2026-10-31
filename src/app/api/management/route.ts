import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authorizedWorkspace } from "@/lib/workspace-auth";
import { getDb } from "@/lib/db";
import { clean, fail, originAllowed } from "@/lib/api";
import {
  contactSchema,
  vehicleSchema,
  invoiceSchema,
  invoiceTotal,
} from "@/lib/management";
import { today } from "@/lib/catalog";
import type { Contact, Invoice } from "@/lib/types";
import { ownedCarPhotos } from "@/lib/car-photo-storage";

async function context() {
  const user = await authorizedWorkspace();
  if (!user || user.role !== "agency") return null;
  const db = await getDb();
  await Promise.all([
    db.collection("contacts").createIndex({ id: 1 }, { unique: true }),
    db.collection("vehicles").createIndex({ id: 1 }, { unique: true }),
    db
      .collection("vehicles")
      .createIndex({ agencyId: 1, plate: 1 }, { unique: true }),
    db.collection("invoices").createIndex({ id: 1 }, { unique: true }),
    db.collection("invoices").createIndex(
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
    const { db, scope } = ctx;
    const [contacts, vehicles, invoices] = await Promise.all([
      db.collection("contacts").find(scope).sort({ name: 1 }).toArray(),
      db.collection("vehicles").find(scope).sort({ name: 1 }).toArray(),
      db.collection("invoices").find(scope).sort({ createdAt: -1 }).toArray(),
    ]);
    return NextResponse.json(clean({ contacts, vehicles, invoices }));
  } catch {
    return fail(
      "We could not load your management records. Please retry.",
      503,
    );
  }
}
const command = z.object({
  action: z.enum(["contact", "vehicle", "invoice", "issue", "payment", "void"]),
  id: z.uuid(),
  version: z.number().int().min(0),
});
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  try {
    const ctx = await context();
    if (!ctx) return fail("Active agency access required.", 403);
    const { user, db, scope } = ctx;
    const body = await req.json();
    const { action, id, version } = command.parse(body);
    const now = new Date().toISOString();
    const conflict = () =>
      fail(
        "This record has changed. Refresh and reopen it before saving.",
        409,
      );
    if (action === "contact" || action === "vehicle") {
      const collection = action === "contact" ? "contacts" : "vehicles";
      const input =
        action === "contact"
          ? contactSchema.parse(body)
          : vehicleSchema.parse(body);
      if (action === "vehicle") {
        const vehicle = input as z.infer<typeof vehicleSchema>;
        if (vehicle.photos)
          vehicle.photos = await ownedCarPhotos(
            db,
            user.agencyId,
            vehicle.photos,
          );
        if (
          vehicle.listingId &&
          !(await db
            .collection("listings")
            .findOne({ id: vehicle.listingId, ...scope, category: "cars" }))
        )
          return fail("Choose a car listing belonging to your agency.");
      }
      if (version === 0) {
        await db.collection(collection).insertOne({
          ...input,
          ...scope,
          id,
          version: 1,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const result = await db
          .collection(collection)
          .updateOne(
            { id, ...scope, version },
            { $set: { ...input, updatedAt: now }, $inc: { version: 1 } },
          );
        if (!result.matchedCount) return conflict();
      }
    } else if (action === "invoice") {
      const input = invoiceSchema.parse(body);
      const total = invoiceTotal(input.items);
      const contact = await db
        .collection<Contact>("contacts")
        .findOne({ id: input.contactId, ...scope, status: "active" });
      if (!contact)
        return fail("Choose an active contact belonging to your agency.");
      if (
        input.bookingId &&
        !(await db
          .collection("bookings")
          .findOne({ id: input.bookingId, ...scope }))
      )
        return fail("Reservation not found.", 404);
      const agency = await db
        .collection("agencies")
        .findOne({ id: user.agencyId });
      const snapshot = {
        ...input,
        total,
        customer: {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          address: contact.address,
        },
        issuer: {
          name: agency!.name,
          email: agency!.email,
          phone: agency!.phone || "",
          registration: agency!.registration || "",
          address: agency!.billingAddress || agency!.city,
          taxId: agency!.taxId || "",
        },
        updatedAt: now,
      };
      if (!version)
        await db.collection("invoices").insertOne({
          ...snapshot,
          ...scope,
          id,
          version: 1,
          status: "draft",
          paid: 0,
          payments: [],
          createdAt: now,
        });
      else {
        const result = await db
          .collection("invoices")
          .updateOne(
            { id, ...scope, version, status: "draft" },
            { $set: snapshot, $inc: { version: 1 } },
          );
        if (!result.matchedCount) return conflict();
      }
    } else {
      const invoice = await db
        .collection<Invoice>("invoices")
        .findOne({ id, ...scope, version });
      if (!invoice) return conflict();
      let changes: Record<string, unknown>;
      if (action === "issue") {
        if (invoice.status !== "draft")
          return fail("Only a draft can be issued.", 409);
        const contact = await db
          .collection<Contact>("contacts")
          .findOne({ id: invoice.contactId, ...scope, status: "active" });
        if (!contact)
          return fail("Restore the invoice contact before issuing.");
        const counter = await db
          .collection<{ _id: string; value: number }>("invoice_counters")
          .findOneAndUpdate(
            { _id: `${user.agencyId}:${invoice.issueDate.slice(0, 4)}` },
            { $inc: { value: 1 } },
            { upsert: true, returnDocument: "after" },
          );
        changes = {
          status: "issued",
          number: `INV-${invoice.issueDate.slice(0, 4)}-${String(counter!.value).padStart(5, "0")}`,
          issuedAt: now,
        };
      } else if (action === "payment") {
        if (invoice.status !== "issued")
          return fail("Payments can only be recorded on issued invoices.", 409);
        const payment = z
          .object({
            amount: z.number().int().min(1),
            date: z.iso.date(),
            reference: z.string().trim().min(2).max(200),
          })
          .parse(body);
        if (payment.date > today())
          return fail("Payment date cannot be in the future.");
        if (invoice.paid + payment.amount > invoice.total)
          return fail("Payment exceeds the remaining invoice balance.");
        changes = {
          paid: invoice.paid + payment.amount,
          payments: [...invoice.payments, { ...payment, id: randomUUID() }],
        };
      } else {
        if (invoice.status === "void" || invoice.paid > 0)
          return fail("Only an unpaid draft or invoice can be voided.", 409);
        changes = { status: "void", voidedAt: now };
      }
      const result = await db
        .collection<Invoice>("invoices")
        .updateOne(
          { id, ...scope, version, status: invoice.status },
          { $set: { ...changes, updatedAt: now }, $inc: { version: 1 } },
        );
      if (!result.matchedCount) return conflict();
    }
    await db.collection("audit").insertOne({
      actor: user.id,
      agencyId: user.agencyId,
      action: `management.${action}`,
      recordId: id,
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (error instanceof RangeError) return fail(error.message);
    if (error instanceof z.ZodError)
      return fail(error.issues[0]?.message || "Check the form fields.");
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      return fail(
        "This record or registration plate already exists. Refresh before trying again.",
        409,
      );
    return fail(
      "Your management record could not be saved. Check the details and retry.",
      503,
    );
  }
}
