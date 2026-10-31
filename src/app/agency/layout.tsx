import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import Dashboard from "@/components/dashboard";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await session();
  if (!s) redirect("/login?next=agency");
  if (s.role !== "agency") redirect("/platform");
  return (
    <>
      <Dashboard key={s.id} role="agency" userId={s.id} />
      {children}
    </>
  );
}
