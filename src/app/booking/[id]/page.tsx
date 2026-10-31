import { localizeMetadata } from "@/i18n/server";
import PublicShell from "@/components/public-shell";
import ManageBooking from "@/components/manage-booking";
export async function generateMetadata() {
  return localizeMetadata({
    title: "Your reservation",
    robots: { index: false, follow: false },
    referrer: "no-referrer" as const,
  });
}
export default async function BookingPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  return (
    <PublicShell>
      <main tabIndex={-1} id="main-content">
        <ManageBooking key={id} id={id} />
      </main>
    </PublicShell>
  );
}
