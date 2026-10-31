import { session } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fail } from "@/lib/api";
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await session();
  if (!user || user.role !== "platform")
    return fail("Platform access required.", 403);
  const db = await getDb();
  if (
    !(await db.collection("users").findOne({ id: user.id, role: "platform" }))
  )
    return fail("Platform access required.", 403);
  const { id } = await context.params;
  const agency = await db.collection("agencies").findOne({ id });
  const document = await db
    .collection("partner_documents")
    .findOne({ agencyId: id });
  if (!agency || !document) return fail("Document not found.", 404);
  return new Response(new Uint8Array(document.data.buffer), {
    headers: {
      "Content-Type": document.mime,
      "Content-Disposition": `attachment; filename="registration-document"; filename*=UTF-8''${encodeURIComponent(agency.document?.name || "registration-document").replace(/'/g, "%27")}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
