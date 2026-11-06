import { loadEnvConfig } from "@next/env";
import { coreDb, coreTransaction } from "../src/lib/kracar/client";
loadEnvConfig(process.cwd());
const db = coreDb();
export async function tick() {
  await db.booking.updateMany({
    where: { status: "requested", start: { lt: new Date() } },
    data: { status: "expired", version: { increment: 1 } },
  });
  const jobs = await db.backgroundJob.findMany({
    where: { status: "pending", nextAt: { lte: new Date() } },
    take: 20,
    orderBy: { createdAt: "asc" },
  });
  for (const job of jobs) {
    try {
      await coreTransaction(async (tx) => {
        const current = await tx.backgroundJob.findUniqueOrThrow({
          where: { id: job.id },
        });
        if (current.status !== "pending") return;
        const p = current.payload as {
          actorId: string;
          agencyId?: string;
          action: string;
          recordId: string;
        };
        const members = p.agencyId
          ? await tx.agencyMember.findMany({
              where: { agencyId: p.agencyId, active: true, role: "admin" },
            })
          : [];
        const recipients = [
          ...new Set([p.actorId, ...members.map((m) => m.userId)]),
        ];
        for (const userId of recipients) {
          const user = await tx.user.findUnique({ where: { id: userId } });
          if (!user) continue;
          const message =
            "Votre espace KraCar a été mis à jour. Consultez vos locations et documents.";
          await tx.notification.create({
            data: { userId, agencyId: p.agencyId, message },
          });
          await tx.emailPreview.create({
            data: {
              recipient: user.email,
              subject: "KraCar — mise à jour de votre dossier",
              body: message,
            },
          });
        }
        await tx.backgroundJob.update({
          where: { id: job.id },
          data: { status: "completed", attempts: { increment: 1 } },
        });
      });
    } catch {
      await db.backgroundJob.update({
        where: { id: job.id },
        data: {
          attempts: { increment: 1 },
          status: job.attempts >= 4 ? "failed" : "pending",
          lastError: "Notification preparation failed; retry scheduled.",
          nextAt: new Date(
            Date.now() + Math.min(3600000, 30000 * 2 ** job.attempts),
          ),
        },
      });
    }
  }
}
async function main() {
  do {
    await tick();
    if (process.argv.includes("--once")) break;
    await new Promise((r) => setTimeout(r, 10000));
  } while (true);
}
main().finally(() => db.$disconnect());
