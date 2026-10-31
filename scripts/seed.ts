import nextEnv from "@next/env";
import { getDb, seedDatabase } from "../src/lib/db";
async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  process.env.DEMO_MODE = "false";
  if (
    !process.env.ADMIN_EMAIL ||
    !process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD.length < 12
  )
    throw new Error(
      "Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters before provisioning.",
    );
  await seedDatabase(await getDb(), false);
  console.log(
    "Configured staff accounts created. Existing passwords are not overwritten.",
  );
  process.exit(0);
}
main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
