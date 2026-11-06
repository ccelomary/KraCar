import { NextResponse } from "next/server";
import { z } from "zod";
import { coreActor } from "@/lib/kracar/auth";
import { command, workspace } from "@/lib/kracar/service";
import { originAllowed, fail } from "@/lib/api";
export async function GET() {
  try {
    const actor = await coreActor();
    if (!actor) return fail("Please sign in to continue.", 401);
    return NextResponse.json(await workspace(actor));
  } catch {
    return fail(
      "Your workspace is temporarily unavailable. Please retry.",
      503,
    );
  }
}
export async function POST(req: Request) {
  if (!originAllowed(req)) return fail("Request origin rejected.", 403);
  try {
    const actor = await coreActor();
    if (!actor) return fail("Please sign in to continue.", 401);
    const body = await req.text();
    if (body.length > 100000) return fail("Request is too large.", 413);
    return NextResponse.json(await command(actor, JSON.parse(body)));
  } catch (error) {
    if (error instanceof z.ZodError)
      return fail("Please check the form fields and try again.");
    if (error instanceof Error && error.message === "ACCESS_DENIED")
      return fail("You do not have permission for this action.", 403);
    if (error instanceof Error && "code" in error)
      return fail(
        "This operation conflicts with existing records or availability. Refresh and retry.",
        409,
      );
    return fail(
      error instanceof Error
        ? error.message
        : "Your change could not be saved. Please retry.",
    );
  }
}
