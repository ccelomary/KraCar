import { z } from "zod";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { fail, originAllowed, rateLimit } from "@/lib/api";
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  try {
    if (!(await rateLimit(req, "support", 8)))
      return fail("Please wait before sending another message.", 429);
    const parsed = z
      .object({
        name: z.string().trim().min(2).max(100),
        email: z.email().max(200),
        subject: z.string().min(3).max(120),
        message: z.string().trim().min(10).max(3000),
        consent: z.literal(true),
      })
      .safeParse(await req.json());
    if (!parsed.success)
      return fail("Please complete all fields and accept the privacy notice.");
    await (await getDb()).collection("tickets").insertOne({
      ...parsed.data,
      id: randomUUID(),
      status: "open",
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return fail("Your message could not be saved. Please try again.", 503);
  }
}
