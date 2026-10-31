import "server-only";
import { session } from "./auth";
import { getDb } from "./db";

export async function authorizedWorkspace() {
  const s = await session();
  if (!s) return null;
  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ id: s.id, role: s.role, agencyId: s.agencyId });
  if (!user) return null;
  if (
    s.role === "agency" &&
    !(await db
      .collection("agencies")
      .findOne({ id: s.agencyId, status: "active" }))
  )
    return null;
  return { ...s, name: user.name, email: user.email };
}
