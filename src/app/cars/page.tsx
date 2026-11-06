import { Suspense } from "react";
import PublicShell from "@/components/public-shell";
import { RentalCatalogue } from "@/components/kracar-marketplace";
export default function Cars(){return <PublicShell><main id="main-content" tabIndex={-1}><Suspense fallback={<div className="skeleton"/>}><RentalCatalogue/></Suspense></main></PublicShell>;}
