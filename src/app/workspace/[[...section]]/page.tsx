import { redirect } from "next/navigation";
import { coreActor } from "@/lib/kracar/auth";
import PublicShell from "@/components/public-shell";
import KraCarWorkspace from "@/components/kracar-workspace";
export const dynamic="force-dynamic";
export default async function Workspace(){const actor=await coreActor();if(!actor)redirect("/account");return <PublicShell><main id="main-content" tabIndex={-1}><KraCarWorkspace/></main></PublicShell>;}
