import { MongoMemoryServer } from "mongodb-memory-server";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
let mongo;
if (!process.env.MONGODB_URI) {
  await mkdir(".data/mongo", { recursive: true });
  mongo = await MongoMemoryServer.create({
    instance: {
      dbPath: ".data/mongo",
      storageEngine: "wiredTiger",
      dbName: "atlas_journeys",
    },
  });
  process.env.MONGODB_URI = mongo.getUri();
  process.env.DEMO_MODE = "true";
  console.log(
    "Local MongoDB ready. Sample mode enabled; data persists in .data/mongo.",
  );
}
process.env.SESSION_SECRET ||= randomBytes(48).toString("hex");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit", env: process.env },
);
async function stop() {
  child.kill();
  if (mongo) await mongo.stop();
  process.exit();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", async (code) => {
  if (mongo) await mongo.stop();
  process.exit(code ?? 0);
});
