import { Prisma, PrismaClient } from "@prisma/client";
import { rentalMongoUri } from "./mongo-config";

const globalCore = globalThis as unknown as { kracarMongo?: PrismaClient };
export function coreDb() {
  return (globalCore.kracarMongo ??= new PrismaClient({
    datasourceUrl: rentalMongoUri(),
  }));
}

/** A shared write serializes financial/inventory commands across app processes.
 * MongoDB aborts competing snapshots; retry the entire transaction on conflict.
 */
export async function coreTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const db = coreDb();
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          await tx.documentSequence.upsert({
            where: { id: "lock:rental-core" },
            create: { id: "lock:rental-core", value: 1 },
            update: { value: { increment: 1 } },
          });
          return work(tx);
        },
        { maxWait: 10000, timeout: 20000 },
      );
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        !["P2034", "P2002"].includes(error.code) ||
        attempt >= 5
      )
        throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 25 * 2 ** attempt + Math.random() * 25),
      );
    }
  }
}
