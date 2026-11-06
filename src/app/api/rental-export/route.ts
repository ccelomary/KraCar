import { coreActor, requirePermission } from "@/lib/kracar/auth";
import { coreDb } from "@/lib/kracar/db";
import { fail } from "@/lib/api";
export async function GET() {
  try {
    const actor = await coreActor();
    if (!actor) return fail("Please sign in to continue.", 401);
    requirePermission(actor, actor.agencyId || "", "finance");
    const rows = await coreDb().payment.findMany({
      where: actor.role === "platform" ? {} : { agencyId: actor.agencyId },
      orderBy: { createdAt: "desc" },
    });
    const csv = (v: unknown) =>
      `"${String(v ?? "")
        .replace(/^[=+@-]/, "'")
        .replaceAll('"', '""')}"`;
    const content = [
      [
        "Date",
        "Agency",
        "Method",
        "Recipient",
        "MAD minor units",
        "Refunded",
        "Verification",
        "Reference",
        "Recorded by",
      ],
      ...rows.map((p) => [
        p.createdAt.toISOString(),
        p.agencyId,
        p.method,
        p.recipient,
        p.amount,
        p.refunded,
        p.verification,
        p.reference,
        p.recordedBy,
      ]),
    ]
      .map((r) => r.map(csv).join(","))
      .join("\r\n");
    return new Response("\uFEFF" + content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=kracar-transactions.csv",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return fail("Export unavailable.", 403);
  }
}
