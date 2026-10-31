import { localizeMetadata } from "@/i18n/server";
import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
export async function generateMetadata() {
  return localizeMetadata({ title: "Agency workspace" });
}
export default async function WorkspacePage() {
  const s = await session();
  if (!s) redirect("/login?next=agency");
  if (s.role !== "agency") redirect("/platform");
  return null;
}
