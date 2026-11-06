import { coreActor } from "@/lib/kracar/auth";
import { rentalDocument } from "@/lib/kracar/documents";
import { fail } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await coreActor();
    if (!actor) return fail("Please sign in to continue.", 401);
    const p = new URL(req.url).searchParams,
      { id } = await params;
    const document = await rentalDocument(
      actor,
      id,
      p.get("kind") || "document",
      p.get("language") || "fr",
    );
    if (p.get("format") === "pdf") {
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.route("**/*", (route) => route.abort());
        await page.setContent(document.html, { waitUntil: "load" });
        await page.evaluate(() => globalThis.document.fonts.ready);
        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
          tagged: true,
        });
        return new Response(new Uint8Array(pdf), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=kracar-${id}.pdf`,
            "Cache-Control": "private, no-store",
          },
        });
      } finally {
        await browser.close();
      }
    }
    return new Response(document.html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; font-src data:; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      },
    });
  } catch (error) {
    return fail(
      error instanceof Error && error.message === "ACCESS_DENIED"
        ? "You do not have permission to view this document."
        : "Document unavailable.",
      403,
    );
  }
}
