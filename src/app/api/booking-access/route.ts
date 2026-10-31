import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { clean, fail, originAllowed, rateLimit } from "@/lib/api";
import { z } from "zod";
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  try {
    if (!(await rateLimit(req, "booking-access", 30)))
      return fail("Too many attempts. Please try again later.", 429);
    const input = z
      .object({
        id: z.string().min(3).max(30),
        token: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
        cancel: z.boolean().optional(),
      })
      .safeParse(await req.json());
    if (!input.success)
      return fail("A valid private booking link is required.", 401);
    const jar = await cookies();
    const raw = input.data.token || jar.get(`booking-${input.data.id}`)?.value;
    if (!raw)
      return fail("Open your saved private booking link to continue.", 401);
    const db = await getDb();
    const filter = {
      id: input.data.id,
      tokenHash: createHash("sha256").update(raw).digest("hex"),
      tokenExpiresAt: { $gt: new Date().toISOString() },
    };
    const booking = await db.collection("bookings").findOne(filter);
    if (!booking) return fail("This private booking link is invalid.", 404);
    jar.set(`booking-${input.data.id}`, raw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    });
    if (input.data.cancel) {
      const updated = await db
        .collection("bookings")
        .findOneAndUpdate(
          { ...filter, status: { $in: ["requested", "awaiting_payment"] } },
          { $set: { status: "cancelled" } },
          { returnDocument: "after" },
        );
      if (!updated)
        return fail(
          "Please contact support to change a confirmed reservation.",
          409,
        );
      return NextResponse.json(clean(updated));
    }
    return NextResponse.json(clean(booking));
  } catch {
    return fail("Your reservation could not be loaded. Please retry.", 503);
  }
}
