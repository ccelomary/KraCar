import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Binary, MongoServerError } from "mongodb";
import { getDb } from "@/lib/db";
import { fail, originAllowed, rateLimit } from "@/lib/api";
import {
  documentLimit,
  documentType,
  partnerSchema,
} from "@/lib/partner-application";
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  try {
    if (!(await rateLimit(req, "partner", 5)))
      return fail("Please wait before applying again.", 429);
    if (!req.headers.get("content-type")?.startsWith("multipart/form-data"))
      return fail("Send your application with a registration document.");
    const reader = req.body?.getReader();
    if (!reader)
      return fail("Complete all business fields and accept both declarations.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    // Bound actual bytes before parsing, including requests without Content-Length.
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > documentLimit + 64 * 1024) {
        await reader.cancel();
        return fail(
          "Choose a PDF, JPEG or PNG document no larger than 5 MB.",
          413,
        );
      }
      chunks.push(chunk.value);
    }
    let form: FormData;
    try {
      form = await new Response(Buffer.concat(chunks), {
        headers: { "Content-Type": req.headers.get("content-type")! },
      }).formData();
    } catch {
      return fail("Send your application with a registration document.");
    }
    const parsed = partnerSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success)
      return fail("Complete all business fields and accept both declarations.");
    const file = form.get("document");
    if (!(file instanceof File) || !file.size || file.size > documentLimit)
      return fail("Choose a PDF, JPEG or PNG document no larger than 5 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = documentType(bytes);
    if (!mime || mime !== file.type)
      return fail("Choose a PDF, JPEG or PNG document no larger than 5 MB.");
    const db = await getDb();
    if (await db.collection("agencies").findOne({ email: parsed.data.email }))
      return fail(
        "An application with this email already exists. Contact support for an update.",
        409,
      );
    const id = randomUUID();
    await db.collection("partner_documents").insertOne({
      agencyId: id,
      data: new Binary(bytes),
      mime,
      createdAt: new Date(),
    });
    try {
      const { authority, consent, ...details } = parsed.data;
      await db.collection("agencies").insertOne({
        ...details,
        id,
        status: "pending",
        joined: new Date().toISOString().slice(0, 10),
        commission: 12,
        declarations: {
          authority: authority === "on",
          consent: consent === "on",
          acceptedAt: new Date().toISOString(),
        },
        document: {
          name: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120),
          size: file.size,
          mime,
        },
      });
    } catch (error) {
      await db.collection("partner_documents").deleteOne({ agencyId: id });
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000)
      return fail(
        "An application with this email already exists. Contact support for an update.",
        409,
      );
    return fail("We could not save your application. Please try again.", 503);
  }
}
