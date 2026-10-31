import { localizeMetadata } from "@/i18n/server";
import { Suspense } from "react";
import PublicShell from "@/components/public-shell";
import Catalog from "@/components/catalog";
export async function generateMetadata() {
  return localizeMetadata({ title: "Explore Morocco" });
}
export default function Explore() {
  return (
    <PublicShell>
      <main tabIndex={-1} id="main-content">
        <Suspense
          fallback={
            <div className="loading-page">
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          }
        >
          <Catalog />
        </Suspense>
      </main>
    </PublicShell>
  );
}
