import { localizeMetadata } from "@/i18n/server";
import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
export async function generateMetadata() {
  return localizeMetadata({ title: "Platform workspace" });
}
export default async function WorkspacePage() {
  const s = await session();
  if (!s) redirect("/login?next=platform");
  if (s.role !== "platform") redirect("/agency");
  return null;
}
