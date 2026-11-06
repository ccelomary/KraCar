import { Suspense } from "react";
import PublicShell from "@/components/public-shell";
import KraCarAccount from "@/components/kracar-account";
export default function Account(){return <PublicShell><main id="main-content" tabIndex={-1}><Suspense fallback={<div className="skeleton"/>}><KraCarAccount/></Suspense></main></PublicShell>;}
