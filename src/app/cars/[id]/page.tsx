import { Suspense } from "react";
import PublicShell from "@/components/public-shell";
import { RentalDetail } from "@/components/kracar-marketplace";
export default async function Car({params}:{params:Promise<{id:string}>}){const{id}=await params;return <PublicShell><main id="main-content" tabIndex={-1}><Suspense fallback={<div className="skeleton"/>}><RentalDetail id={id}/></Suspense></main></PublicShell>;}
