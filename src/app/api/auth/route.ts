import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb, demoMode } from "@/lib/db";
import { signSession, verifyPassword } from "@/lib/auth";
import { originAllowed, fail, rateLimit } from "@/lib/api";
import { z } from "zod";
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  try {
    if (!(await rateLimit(req, "login", 20)))
      return fail("Too many attempts. Try again in 10 minutes.", 429);
    const parsed = z
      .object({
        email: z.email().max(200).optional(),
        password: z.string().max(200).optional(),
        demo: z.enum(["agency", "platform"]).optional(),
      })
      .safeParse(await req.json());
    if (!parsed.success) return fail("Check your email and password.");
    const { email, password, demo } = parsed.data;
    if (demo && !demoMode()) return fail("Sample access is disabled.", 403);
    const db = await getDb();
    const user = await db.collection("users").findOne(
      demo
        ? {
            role: demo,
            id: demo === "agency" ? "user-agency" : "user-platform",
          }
        : { email: email?.toLowerCase() },
    );
    if (
      !user ||
      (!demo && (!password || !verifyPassword(password, user.passwordHash)))
    )
      return fail("Email or password is incorrect.", 401);
    if (user.role === "agency") {
      const agency = await db
        .collection("agencies")
        .findOne({ id: user.agencyId });
      if (agency?.status !== "active")
        return fail(
          "Your agency is awaiting approval or has been suspended.",
          403,
        );
    }
    const value = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
      exp: Date.now() + 86400000,
    };
    (await cookies()).set("atlas-session", signSession(value), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
    return NextResponse.json({
      redirect: user.role === "platform" ? "/platform" : "/agency",
    });
  } catch {
    return fail(
      "We could not sign you in. Check the database connection and try again.",
      503,
    );
  }
}
export async function DELETE(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  (await cookies()).delete("atlas-session");
  return NextResponse.json({ ok: true });
}
