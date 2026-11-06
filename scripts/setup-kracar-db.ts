import { MongoClient } from "mongodb";
import { spawnSync } from "node:child_process";
import { loadEnvConfig } from "@next/env";
import { rentalMongoUri } from "../src/lib/kracar/mongo-config";

async function main() {
  loadEnvConfig(process.cwd());
  const uri = rentalMongoUri();
  const client = await new MongoClient(uri).connect();
  try {
    const hello = await client.db().admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== "isdbgrid")
      throw new Error(
        "The rental core requires a MongoDB replica set (or Atlas) for transactions.",
      );
    const result = spawnSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"],
      {
        stdio: "inherit",
        env: { ...process.env, KRACAR_MONGODB_URI: uri },
      },
    );
    if (result.error || result.status !== 0)
      throw result.error || new Error("MongoDB schema setup failed.");
    const db = client.db();
    // MongoDB's normal unique indexes permit only one null. SQL allowed multiple
    // drafts/manual blocks, so constrain only fields containing a real string.
    await db.collection("AvailabilityBlock").createIndex(
      { bookingId: 1 },
      {
        unique: true,
        name: "bookingId_present_unique",
        partialFilterExpression: { bookingId: { $type: "string" } },
      },
    );
    await db.collection("FinancialDocument").createIndex(
      { obligationKey: 1 },
      {
        unique: true,
        name: "obligationKey_present_unique",
        partialFilterExpression: { obligationKey: { $type: "string" } },
      },
    );
    await db.collection("FinancialDocument").createIndex(
      { agencyId: 1, kind: 1, number: 1 },
      {
        unique: true,
        name: "issued_number_unique",
        partialFilterExpression: { number: { $type: "string" } },
      },
    );
    console.log("MongoDB rental schema and partial unique indexes ready.");
  } finally {
    await client.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
