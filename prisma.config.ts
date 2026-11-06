import { defineConfig } from "prisma/config";
import { loadEnvConfig } from "@next/env";
import { rentalMongoUri } from "./src/lib/kracar/mongo-config";
loadEnvConfig(process.cwd());
process.env.KRACAR_MONGODB_URI =
  process.env.KRACAR_MONGODB_URI || process.env.MONGODB_URI
    ? rentalMongoUri()
    : "mongodb://127.0.0.1:27017/kracar_core";
export default defineConfig({ schema: "prisma/schema.prisma" });
