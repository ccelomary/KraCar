import { NextResponse } from "next/server";
import { coreActor, requirePermission } from "@/lib/kracar/auth";
import { coreDb } from "@/lib/kracar/db";
import { objectStorage } from "@/lib/kracar/storage";
import { processCarPhoto } from "@/lib/car-photo-processing";
import { originAllowed, fail } from "@/lib/api";
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  try {
    const actor = await coreActor();
    if (!actor || !actor.agencyId) return fail("Agency access required.", 403);
    const reader = req.body?.getReader();
    if (!reader) return fail("Choose a file.");
    const parts: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const c = await reader.read();
      if (c.done) break;
      size += c.value.length;
      if (size > 5 * 1024 * 1024 + 65536) {
        await reader.cancel();
        return fail("Choose a file no larger than 5 MB.", 413);
      }
      parts.push(c.value);
    }
    const form = await new Response(Buffer.concat(parts), {
      headers: { "Content-Type": req.headers.get("content-type") || "" },
    }).formData();
    const kind = form.get("kind"),
      file = form.get("file");
    requirePermission(
      actor,
      actor.agencyId,
      kind === "verification"
        ? "settings"
        : kind === "handover"
          ? "contracts"
          : "vehicles",
    );
    if (!(file instanceof File)) return fail("Choose a file.");
    let bytes = Buffer.from(await file.arrayBuffer()),
      mime = file.type;
    if (kind === "verification" && mime === "application/pdf") {
      if (
        bytes.subarray(0, 5).toString() !== "%PDF-" ||
        bytes.length > 5 * 1024 * 1024
      )
        throw new Error("Choose a valid PDF no larger than 5 MB.");
    } else {
      const p = await processCarPhoto(bytes, mime);
      bytes = p.bytes;
      mime = "image/webp";
    }
    const object = await objectStorage.put({
      agencyId: actor.agencyId,
      ownerId: actor.id,
      name: file.name.slice(0, 150),
      mime,
      bytes,
      public: kind === "vehicle",
    });
    if (kind === "verification")
      await coreDb().verificationDocument.create({
        data: {
          agencyId: actor.agencyId,
          storageId: object.id,
          kind: "business_registration",
        },
      });
    return NextResponse.json({
      id: object.id,
      src: `/api/rental-media/${object.id}`,
    });
  } catch {
    return fail(
      "The file could not be saved. Check its format and your permissions.",
    );
  }
}
