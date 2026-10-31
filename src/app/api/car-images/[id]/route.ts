import { z } from "zod";
import { authorizedWorkspace } from "@/lib/workspace-auth";
import { getDb } from "@/lib/db";
import { fail } from "@/lib/api";
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) return fail("Photo not found.", 404);
    const db = await getDb(),
      asset = await db.collection("car_images").findOne({ id });
    if (!asset) return fail("Photo not found.", 404);
    const user = await authorizedWorkspace();
    let allowed =
      !!user && (user.role === "platform" || user.agencyId === asset.agencyId);
    if (!allowed) {
      const [agency, listing] = await Promise.all([
        db
          .collection("agencies")
          .findOne({ id: asset.agencyId, status: "active" }),
        db
          .collection("listings")
          .findOne({
            agencyId: asset.agencyId,
            status: "published",
            $or: [{ "photos.id": id }, { image: `/api/car-images/${id}` }],
          }),
      ]);
      allowed = !!agency && !!listing;
    }
    if (!allowed) return fail("Photo not found.", 404);
    return new Response(new Uint8Array(asset.data.buffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline; filename=car-photo.webp",
      },
    });
  } catch {
    return fail("The photo is temporarily unavailable.", 503);
  }
}
