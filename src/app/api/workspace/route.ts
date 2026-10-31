import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizedWorkspace as authorized } from "@/lib/workspace-auth";
import { getDb, demoMode, passwordHash } from "@/lib/db";
import { clean, fail, originAllowed } from "@/lib/api";
import { transitions } from "@/lib/pricing";
import { cities } from "@/lib/catalog";
import { randomUUID } from "node:crypto";
import { carPhotosSchema } from "@/lib/car-photos";
import { ownedCarPhotos } from "@/lib/car-photo-storage";
export async function GET() {
  try {
    const s = await authorized();
    if (!s) return fail("Please sign in to continue.", 401);
    const db = await getDb();
    const scope = s.role === "platform" ? {} : { agencyId: s.agencyId };
    const [bookings, listings, agencies, tickets] = await Promise.all([
      db
        .collection("bookings")
        .find(scope)
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray(),
      db.collection("listings").find(scope).toArray(),
      db
        .collection("agencies")
        .find(s.role === "platform" ? {} : { id: s.agencyId })
        .toArray(),
      s.role === "platform"
        ? db
            .collection("tickets")
            .find({})
            .sort({ createdAt: -1 })
            .limit(200)
            .toArray()
        : [],
    ]);
    return NextResponse.json(
      clean({
        bookings,
        listings,
        agencies,
        tickets,
        session: s,
        demo: demoMode(),
      }),
    );
  } catch {
    return fail("We could not load your workspace. Please retry.", 503);
  }
}
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  try {
    const s = await authorized();
    if (!s) return fail("Please sign in to continue.", 401);
    const db = await getDb();
    const body = await req.json();
    const action = z
      .enum(["booking", "listing", "agency", "settings", "ticket", "access"])
      .safeParse(body.action);
    if (!action.success) return fail("Unknown action.");
    if (action.data === "access") {
      if (s.role !== "platform") return fail("Platform access required.", 403);
      const input = z
        .object({
          agencyId: z.string().max(100),
          name: z.string().trim().min(2).max(80),
          email: z.email().max(200),
          password: z.string().min(12).max(128),
        })
        .parse(body);
      if (
        !(await db
          .collection("agencies")
          .findOne({ id: input.agencyId, status: "active" }))
      )
        return fail("Approve this agency before creating manager access.");
      if (
        await db
          .collection("users")
          .findOne({ email: input.email.toLowerCase() })
      )
        return fail("A staff account already uses this email.", 409);
      await db.collection("users").insertOne({
        id: randomUUID(),
        role: "agency",
        agencyId: input.agencyId,
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: passwordHash(input.password),
      });
    } else if (action.data === "booking") {
      const input = z
        .object({
          id: z.string().max(50),
          status: z.enum([
            "awaiting_payment",
            "declined",
            "cancelled",
            "completed",
          ]),
        })
        .parse(body);
      const filter = {
        id: input.id,
        ...(s.role === "agency" ? { agencyId: s.agencyId } : {}),
      };
      const booking = await db.collection("bookings").findOne(filter);
      if (!booking) return fail("Reservation not found.", 404);
      if (!transitions[booking.status]?.includes(input.status))
        return fail(
          "This reservation has changed. Refresh and try again.",
          409,
        );
      const updated = await db.collection("bookings").updateOne(
        { ...filter, status: booking.status },
        {
          $set: { status: input.status, updatedAt: new Date().toISOString() },
        },
      );
      if (!updated.modifiedCount)
        return fail(
          "This reservation has changed. Refresh and try again.",
          409,
        );
    } else if (action.data === "listing") {
      const input = z
        .object({
          id: z.string().max(100).optional(),
          name: z.string().trim().min(3).max(80),
          category: z.enum(["cars", "activities"]),
          city: z.enum(cities as [string, ...string[]]),
          price: z.number().int().min(500).max(1000000),
          seats: z.number().int().min(1).max(20),
          transmission: z.string().max(40),
          fuel: z.string().max(40),
          description: z.string().min(20).max(2000),
          photos: carPhotosSchema.optional(),
          status: z.enum(["published", "archived"]),
          agencyId: z.string().max(100).optional(),
        })
        .parse(body);
      const agencyId = s.role === "agency" ? s.agencyId : input.agencyId;
      if (
        !agencyId ||
        !(await db
          .collection("agencies")
          .findOne({ id: agencyId, status: "active" }))
      )
        return fail("Choose an active agency.");
      const scope = s.role === "agency" ? { agencyId: s.agencyId } : {};
      const previous = input.id
        ? await db.collection("listings").findOne({ id: input.id, ...scope })
        : null;
      if (input.id && !previous) return fail("Listing not found.", 404);
      if (
        previous &&
        previous.agencyId !== agencyId &&
        input.photos === undefined
      )
        input.photos = [];
      if (input.photos)
        input.photos = await ownedCarPhotos(db, agencyId, input.photos);
      const imageFields = input.photos
        ? {
            image:
              input.photos[0]?.src ||
              `/images/${input.category === "cars" ? "duster" : "surf"}.jpg`,
          }
        : {};
      if (input.id) {
        const result = await db
          .collection("listings")
          .updateOne(
            { id: input.id, ...scope },
            { $set: { ...input, agencyId, ...imageFields } },
          );
        if (!result.matchedCount) return fail("Listing not found.", 404);
      } else {
        await db.collection("listings").insertOne({
          ...input,
          id: randomUUID(),
          agencyId,
          image: `/images/${input.category === "cars" ? "duster" : "surf"}.jpg`,
          ...imageFields,
          badge: "New to explore",
        });
      }
    } else if (action.data === "agency") {
      if (s.role !== "platform") return fail("Platform access required.", 403);
      const input = z
        .object({
          id: z.string().max(100),
          status: z.enum(["active", "suspended", "pending"]),
        })
        .parse(body);
      const result = await db
        .collection("agencies")
        .updateOne({ id: input.id }, { $set: { status: input.status } });
      if (!result.matchedCount) return fail("Agency not found.", 404);
    } else if (action.data === "ticket") {
      if (s.role !== "platform") return fail("Platform access required.", 403);
      const input = z
        .object({
          id: z.string().max(100),
          status: z.enum(["open", "resolved"]),
        })
        .parse(body);
      await db
        .collection("tickets")
        .updateOne({ id: input.id }, { $set: { status: input.status } });
    } else {
      const input = z
        .object({
          name: z.string().trim().min(2).max(80),
          agencyName: z.string().trim().min(2).max(100).optional(),
          city: z.string().max(100).optional(),
          billingAddress: z.string().trim().max(500).optional(),
          taxId: z.string().trim().max(100).optional(),
        })
        .parse(body);
      await db
        .collection("users")
        .updateOne({ id: s.id }, { $set: { name: input.name } });
      if (s.role === "agency" && input.agencyName)
        await db.collection("agencies").updateOne(
          { id: s.agencyId },
          {
            $set: {
              name: input.agencyName,
              city: input.city,
              ...(input.billingAddress !== undefined
                ? { billingAddress: input.billingAddress }
                : {}),
              ...(input.taxId !== undefined ? { taxId: input.taxId } : {}),
            },
          },
        );
    }
    await db.collection("audit").insertOne({
      actor: s.id,
      action: action.data,
      recordId: typeof body.id === "string" ? body.id : null,
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RangeError) return fail(error.message);
    if (error instanceof z.ZodError)
      return fail("Please check the form fields and try again.");
    return fail("Your change could not be saved. Please retry.", 503);
  }
}
