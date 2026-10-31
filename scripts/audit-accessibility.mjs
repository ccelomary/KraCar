import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";

const baseURL = process.env.APP_ORIGIN || "http://127.0.0.1:3000";
const browser = await chromium.launch();
const recheck = process.argv.includes("--recheck");
const report = recheck
  ? JSON.parse(await readFile("replica/accessibility-audit.json", "utf8"))
      .checks
  : [];
const publicPaths = [
  "/",
  "/explore?category=cars",
  "/explore?category=activities",
  "/experiences/dacia-duster",
  "/experiences/taghazout-surf",
  "/partners",
  "/support",
  "/faq",
  "/about",
  "/blog",
  "/article/plan-your-morocco-road-trip",
  "/article/choose-your-coastal-day",
  "/article/arrive-with-a-plan",
  "/policies/terms",
  "/policies/privacy",
  "/policies/cancellation",
  "/login",
  "/experiences/no-such-car",
  "/booking/a11y-missing-private-link",
];
const staffPaths = {
  agency: [
    "/agency",
    "/agency/bookings",
    "/agency/fleet",
    "/agency/vehicles",
    "/agency/contacts",
    "/agency/invoices",
    "/agency/contracts",
    "/agency/calendar",
    "/agency/settings",
  ],
  platform: [
    "/platform",
    "/platform/bookings",
    "/platform/agencies",
    "/platform/listings",
    "/platform/calendar",
    "/platform/support",
    "/platform/settings",
  ],
};
async function scan(page, path, locale, width, state = "default") {
  await page.goto(path);
  await page.locator("main:not(.loading-page)").first().waitFor();
  if (path.startsWith("/agency") || path.startsWith("/platform")) {
    await page.locator(".workspace-content h1").waitFor();
    await page
      .locator(".workspace-content .skeleton")
      .waitFor({ state: "hidden" });
  }
  if (path.startsWith("/booking/"))
    await page
      .getByRole("heading", {
        name:
          locale === "en"
            ? "Your private reservation space"
            : locale === "fr"
              ? "Votre espace de réservation privé"
              : "مساحة حجزك الخاصة",
      })
      .waitFor();
  if (path.startsWith("/explore"))
    await page
      .locator(".result-grid .skeleton")
      .first()
      .waitFor({ state: "hidden" });
  const result = await new AxeBuilder({ page })
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22aa",
      "best-practice",
    ])
    .analyze();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  const violations = result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary,
    })),
  }));
  const record = { path, locale, width, state, overflow, violations };
  const previousIndex = report.findIndex(
    (r) =>
      r.path === path &&
      r.locale === locale &&
      r.width === width &&
      r.state === state,
  );
  if (previousIndex >= 0) {
    record.previousFindings = {
      overflow: report[previousIndex].overflow,
      violations: report[previousIndex].violations,
    };
    report[previousIndex] = record;
  } else report.push(record);
  await writeFile(
    "replica/accessibility-audit.json",
    JSON.stringify(
      { date: new Date().toISOString(), checks: report },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `${locale} ${width} ${path}: ${violations.length} violations${overflow ? " + overflow" : ""}`,
  );
}
try {
  if (recheck) {
    for (const record of report.filter(
      (r) => r.overflow || r.violations.length,
    )) {
      const context = await browser.newContext({
        baseURL,
        viewport: { width: record.width, height: 1000 },
      });
      await context.addCookies([
        { name: "atlas-locale", value: record.locale, url: baseURL },
      ]);
      await context.addInitScript(() =>
        localStorage.setItem("atlas-cookie-choice", "essential"),
      );
      const role = record.path.startsWith("/agency")
        ? "agency"
        : record.path.startsWith("/platform")
          ? "platform"
          : null;
      if (role) {
        const response = await context.request.post("/api/auth", {
          headers: {
            Origin: baseURL,
            "X-Forwarded-For": `a11y-recheck-${Date.now()}`,
          },
          data: { demo: role },
        });
        if (!response.ok()) throw new Error("Audit sign-in failed.");
      }
      await scan(
        await context.newPage(),
        record.path,
        record.locale,
        record.width,
        record.state,
      );
      await context.close();
    }
  } else {
    for (const locale of ["en", "fr", "ar"]) {
      const context = await browser.newContext({ baseURL });
      await context.addCookies([
        { name: "atlas-locale", value: locale, url: baseURL },
      ]);
      await context.addInitScript(() =>
        localStorage.setItem("atlas-cookie-choice", "essential"),
      );
      const page = await context.newPage();
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const path of width === 320
          ? ["/", "/login", "/partners", "/experiences/dacia-duster"]
          : locale === "en"
            ? publicPaths
            : ["/", "/partners", "/support", "/experiences/dacia-duster"])
          await scan(page, path, locale, width);
      }
      for (const role of ["agency", "platform"]) {
        const response = await context.request.post("/api/auth", {
          headers: {
            Origin: baseURL,
            "X-Forwarded-For": `a11y-${locale}-${role}-${Date.now()}`,
          },
          data: { demo: role },
        });
        if (!response.ok())
          throw new Error(`Cannot audit ${role} sign-in: ${response.status()}`);
        for (const width of [1440, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          for (const path of width === 320
            ? role === "agency"
              ? ["/agency/bookings", "/agency/invoices"]
              : ["/platform"]
            : locale === "en"
              ? staffPaths[role]
              : role === "agency"
                ? [
                    "/agency/contacts",
                    "/agency/vehicles",
                    "/agency/invoices",
                    "/agency/contracts",
                  ]
                : ["/platform"])
            await scan(page, path, locale, width);
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  await mkdir("replica", { recursive: true });
  await writeFile(
    "replica/accessibility-audit.json",
    JSON.stringify(
      { date: new Date().toISOString(), checks: report },
      null,
      2,
    ) + "\n",
  );
  const failures = report.filter((r) => r.overflow || r.violations.length);
  if (failures.length) process.exitCode = 1;
  console.log(
    `${report.length} screens checked; ${failures.length} with findings. Report: replica/accessibility-audit.json`,
  );
}
