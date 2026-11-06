import { coreActor, requirePermission } from "@/lib/kracar/auth";
import { coreDb } from "@/lib/kracar/db";
import { objectStorage } from "@/lib/kracar/storage";
import { fail } from "@/lib/api";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const o = await objectStorage.get(id);
    if (!o) return fail("File not found.", 404);
    const actor = await coreActor();
    let allowed = false;
    if (actor) {
      try {
        requirePermission(
          actor,
          o.agencyId,
          o.mime.startsWith("image/") ? "vehicles" : "settings",
        );
        allowed = true;
      } catch {}
    }
    if (!allowed && o.public && o.mime.startsWith("image/")) {
      const src = `/api/rental-media/${id}`;
      const cars = await coreDb().vehicle.findMany({
        where: {
          agencyId: o.agencyId,
          status: "published",
          agency: { status: "active" },
        },
        select: { images: true },
      });
      allowed = cars.some((c) =>
        (c.images as { src: string }[]).some((i) => i.src === src),
      );
    }
    if (!allowed) return fail("File not found.", 404);
    return new Response(new Uint8Array(o.bytes), {
      headers: {
        "Content-Type": o.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": o.mime.startsWith("image/")
          ? "inline"
          : "attachment; filename=verification.pdf",
      },
    });
  } catch {
    return fail("File unavailable.", 503);
  }
}
