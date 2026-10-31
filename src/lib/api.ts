import "server-only";
import { NextResponse } from "next/server";
import { getDb } from "./db";
import { createHash } from "node:crypto";
import { getTranslator } from "@/i18n/server";
export function originAllowed(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  if (process.env.APP_ORIGIN)
    return origin === new URL(process.env.APP_ORIGIN).origin;
  if (process.env.NODE_ENV === "production") return false;
  try {
    return (
      new URL(origin).host === req.headers.get("host") &&
      new URL(origin).protocol === new URL(req.url).protocol
    );
  } catch {
    return false;
  }
}
export async function fail(message: string, status = 400) {
  const t = await getTranslator();
  return NextResponse.json({ error: t(message) }, { status });
}
export async function rateLimit(req: Request, scope: string, max = 15) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const bucket = Math.floor(Date.now() / 600000);
  const id = createHash("sha256")
    .update(`${scope}:${ip}:${bucket}`)
    .digest("hex");
  const db = await getDb();
  const result = await db.collection("limits").findOneAndUpdate(
    { _id: id as never },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(Date.now() + 1200000) },
    },
    { upsert: true, returnDocument: "after" },
  );
  return (result?.count || 0) <= max;
}
export function clean<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      key === "_id" ||
      key === "tokenHash" ||
      key === "idempotencyKey" ||
      key === "requestSignature"
        ? undefined
        : value,
    ),
  );
}
