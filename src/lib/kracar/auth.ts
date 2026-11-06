import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { coreDb } from "./db";
import { authorizedWorkspace } from "../workspace-auth";
export function customerAuth() {
  return betterAuth({
    appName: "KraCar",
    basePath: "/api/customer-auth",
    baseURL: process.env.APP_ORIGIN,
    secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET,
    database: prismaAdapter(coreDb(), { provider: "mongodb" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      sendResetPassword: async ({ user, url }) => {
        // Deliberately local/private. An email delivery adapter must be configured separately.
        await coreDb().emailPreview.create({
          data: {
            recipient: user.email,
            subject: "KraCar — password recovery",
            body: url,
          },
        });
      },
    },
    trustedOrigins: process.env.APP_ORIGIN ? [process.env.APP_ORIGIN] : [],
  });
}
let auth: ReturnType<typeof customerAuth> | undefined;
export function getCustomerAuth() {
  return (auth ??= customerAuth());
}
export type Actor = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "agency" | "platform";
  agencyId?: string;
  permissions: string[];
  agencyStatus?: string;
};
export async function coreActor(): Promise<Actor | null> {
  const staff = await authorizedWorkspace();
  if (staff) return { ...staff, permissions: ["*"] };
  const s = await getCustomerAuth().api.getSession({
    headers: await headers(),
  });
  if (!s) return null;
  const member = await coreDb().agencyMember.findFirst({
    where: { userId: s.user.id, active: true },
    include: { agency: true },
  });
  return {
    id: s.user.id,
    name: s.user.name,
    email: s.user.email,
    role:
      member?.role === "platform" ? "platform" : member ? "agency" : "customer",
    agencyId: member?.agencyId,
    agencyStatus: member?.agency.status,
    permissions:
      member && member.agency.status !== "active"
        ? ["settings"]
        : ["admin", "platform"].includes(member?.role || "")
          ? ["*"]
          : member?.permissions || [],
  };
}
export function requirePermission(
  actor: Actor,
  agencyId: string,
  permission: string,
) {
  if (actor.role === "platform") return;
  if (
    actor.agencyStatus &&
    actor.agencyStatus !== "active" &&
    permission !== "settings"
  )
    throw new Error("ACCESS_DENIED");
  if (
    actor.role !== "agency" ||
    actor.agencyId !== agencyId ||
    (!actor.permissions.includes("*") &&
      !actor.permissions.includes(permission))
  )
    throw new Error("ACCESS_DENIED");
}
