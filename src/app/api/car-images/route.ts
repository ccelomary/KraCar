import { randomUUID } from "node:crypto";
import { Binary } from "mongodb";
import { NextResponse } from "next/server";
import { authorizedWorkspace } from "@/lib/workspace-auth";
import { getDb } from "@/lib/db";
import { fail, originAllowed, rateLimit } from "@/lib/api";
import { photoLimit } from "@/lib/car-photos";
import { processCarPhoto } from "@/lib/car-photo-processing";
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  try {
    const user = await authorizedWorkspace();
    if (!user) return fail("Please sign in to continue.", 401);
    if (!(await rateLimit(req, `car-photo-${user.id}`, 60)))
      return fail("Please wait before uploading more photos.", 429);
    const contentType = req.headers.get("content-type");
    if (!contentType?.startsWith("multipart/form-data"))
      return fail("Choose a car photo to upload.");
    const reader = req.body?.getReader();
    if (!reader) return fail("Choose a car photo to upload.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > photoLimit + 65536) {
        await reader.cancel();
        return fail(
          "Choose a JPEG, PNG or WebP photo no larger than 5 MB.",
          413,
        );
      }
      chunks.push(chunk.value);
    }
    let form: FormData;
    try {
      form = await new Response(Buffer.concat(chunks), {
        headers: { "Content-Type": contentType },
      }).formData();
    } catch {
      return fail("Choose a car photo to upload.");
    }
    const agencyId =
      user.role === "agency" ? user.agencyId : form.get("agencyId");
    if (
      typeof agencyId !== "string" ||
      agencyId.length > 100 ||
      (user.role === "agency" &&
        form.get("agencyId") &&
        form.get("agencyId") !== agencyId)
    )
      return fail("Choose an active agency.", 403);
    const db = await getDb();
    if (
      !(await db
        .collection("agencies")
        .findOne({ id: agencyId, status: "active" }))
    )
      return fail("Choose an active agency.", 403);
    const file = form.get("photo");
    if (!(file instanceof File)) return fail("Choose a car photo to upload.");
    const processed = await processCarPhoto(
        Buffer.from(await file.arrayBuffer()),
        file.type,
      ),
      id = randomUUID();
    await Promise.all([
      db.collection("car_images").createIndex({ id: 1 }, { unique: true }),
      db
        .collection("car_images")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    await db
      .collection("car_images")
      .insertOne({
        id,
        agencyId,
        data: new Binary(processed.bytes),
        mime: "image/webp",
        width: processed.width,
        height: processed.height,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });
    return NextResponse.json({
      id,
      src: `/api/car-images/${id}`,
      width: processed.width,
      height: processed.height,
      description: "",
    });
  } catch (error) {
    if (error instanceof RangeError) return fail(error.message);
    return fail("The photo could not be uploaded. Please retry.", 503);
  }
}
