import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, scryptSync } from "node:crypto";
import type { Session } from "./types";
function secret() {
  const key = process.env.SESSION_SECRET;
  if (!key || key.length < 32)
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return key;
}
export function signSession(session: Session) {
  const data = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${data}.${createHmac("sha256", secret()).update(data).digest("base64url")}`;
}
export async function session() {
  const value = (await cookies()).get("atlas-session")?.value;
  if (!value) return null;
  try {
    const [data, sig] = value.split(".");
    const expected = createHmac("sha256", secret())
      .update(data)
      .digest("base64url");
    if (
      !sig ||
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    )
      return null;
    const s = JSON.parse(Buffer.from(data, "base64url").toString()) as Session;
    return s.exp > Date.now() && ["agency", "platform"].includes(s.role)
      ? s
      : null;
  } catch {
    return null;
  }
}
export function verifyPassword(password: string, hash: string) {
  const [salt, value] = hash.split(":");
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(value, "hex");
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}
