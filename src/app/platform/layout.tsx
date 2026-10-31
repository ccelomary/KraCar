import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import Dashboard from "@/components/dashboard";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await session();
  if (!s) redirect("/login?next=platform");
  if (s.role !== "platform") redirect("/agency");
  return (
    <>
      <Dashboard key={s.id} role="platform" userId={s.id} />
      {children}
    </>
  );
}
