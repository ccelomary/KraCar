import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash, createHmac } from "node:crypto";
import { categories } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { quote, plans, yearsOnDate } from "@/lib/pricing";
import { today } from "@/lib/catalog";
import { clean, fail, originAllowed, rateLimit } from "@/lib/api";
import type { Listing } from "@/lib/types";
const schema = z.object({
  listingId: z.string().max(100),
  start: z.iso.date(),
  end: z.iso.date(),
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  phone: z.string().trim().min(6).max(30),
  pickup: z.string().trim().min(3).max(200),
  returnCity: z.string().max(100),
  guests: z.number().int().min(1).max(20),
  protection: z.enum(["essential", "comfort", "plus", "own"]),
  extras: z.number().int().min(0).max(3),
  dob: z.iso.date().optional(),
  licenceDate: z.iso.date().optional(),
  notes: z.string().max(1500),
  consent: z.literal(true),
  idempotencyKey: z.uuid(),
});
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  try {
    if (!(await rateLimit(req, "booking")))
      return fail("Please wait before submitting another request.", 429);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success)
      return fail("Please check the form fields and try again.");
    const input = parsed.data;
    if (input.start < today() || input.end < input.start)
      return fail("Choose a future trip with a valid return date.");
    const db = await getDb();
    const listing = await db.collection<Listing>("listings").findOne({
      id: input.listingId,
      status: "published",
      category: { $in: categories.map((c) => c.id) },
    });
    if (!listing) return fail("This experience is no longer available.", 404);
    if (
      !(await db
        .collection("agencies")
        .findOne({ id: listing.agencyId, status: "active" }))
    )
      return fail("This provider is currently unavailable.", 409);
    if (listing.category === "cars") {
      if (input.end <= input.start)
        return fail("Return date must be after pickup.");
      if (!input.dob || !input.licenceDate)
        return fail("Add the driver’s birth date and licence issue date.");
      const age = yearsOnDate(input.dob, input.start);
      const tenure = yearsOnDate(input.licenceDate, input.start);
      if (
        age < (plans.find((p) => p.id === input.protection)?.age || 21) ||
        age > 90
      )
        return fail(
          "The driver does not meet the selected protection’s age requirement.",
        );
      if (tenure < 1 || input.licenceDate < input.dob)
        return fail(
          "A driving licence held for at least one year is required.",
        );
    }
    const price = quote(
      listing,
      input.start,
      input.end,
      input.protection,
      input.extras,
      input.guests,
    );
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32)
      return fail("Reservation access is not configured.", 503);
    const token = createHmac("sha256", secret)
      .update(`booking:${input.idempotencyKey}`)
      .digest("hex");
    const requestSignature = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const existing = await db
      .collection("bookings")
      .findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) {
      if (
        existing.requestSignature !== requestSignature ||
        existing.tokenHash !== createHash("sha256").update(token).digest("hex")
      )
        return fail(
          "This request was already submitted with different details. Use its original private booking link.",
          409,
        );
      return NextResponse.json({ booking: clean(existing), token });
    }
    const id = `AJ-${randomBytes(4).toString("hex").toUpperCase()}`;
    const booking = {
      id,
      agencyId: listing.agencyId,
      listingId: listing.id,
      listingName: listing.name,
      category: listing.category,
      city: listing.city,
      name: input.name,
      email: input.email,
      phone: input.phone,
      start: input.start,
      end: input.end,
      pickup: input.pickup,
      returnCity: input.returnCity,
      guests: input.guests,
      protection: input.protection,
      extras: input.extras,
      total: price.total,
      priceSnapshot: price,
      acceptedConditions: {
        platformVersion: "2026-11-02",
        providerId: listing.agencyId,
        description: listing.description,
        acceptedAt: new Date().toISOString(),
      },
      deposit: price.deposit,
      status: "requested",
      createdAt: new Date().toISOString(),
      notes: input.notes,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      tokenExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      idempotencyKey: input.idempotencyKey,
      requestSignature,
      policyVersion: "2026-11-02",
      consentAt: new Date().toISOString(),
    };
    try {
      await db.collection("bookings").insertOne(booking);
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const saved = await db
        .collection("bookings")
        .findOne({ idempotencyKey: input.idempotencyKey, requestSignature });
      if (!saved) return fail("A conflicting request already exists.", 409);
      return NextResponse.json({ booking: clean(saved), token });
    }
    return NextResponse.json(
      { booking: clean(booking), token },
      { status: 201 },
    );
  } catch (error) {
    return fail(
      error instanceof Error && error.message.startsWith("Choose")
        ? error.message
        : "We could not save your request. Please try again.",
      503,
    );
  }
}
