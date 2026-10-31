import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";

async function scan(page: Page) {
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
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("atlas-cookie-choice", "essential"),
  );
});

test("public keyboard navigation, service tabs, skip link and button hover stay accessible", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  expect(
    await skip.evaluate((el) => el.getBoundingClientRect().top),
  ).toBeGreaterThanOrEqual(0);
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  const cars = page.getByRole("tab", { name: "Car rentals", exact: true }),
    activities = page.getByRole("tab", { name: "Things to do", exact: true });
  await cars.focus();
  await page.keyboard.press("ArrowRight");
  await expect(activities).toBeFocused();
  await expect(activities).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tabpanel", { name: "Things to do" }),
  ).toBeVisible();
  await page.keyboard.press("Home");
  await expect(cars).toBeFocused();
  const partner = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Become a partner", exact: true });
  await partner.hover();
  await expect(partner).toHaveCSS("color", "rgb(255, 255, 255)");
  await scan(page);
  await page.screenshot({
    path: "replica/clone-screens/accessibility-header-hover.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  await menu.click();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Car rentals", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Become a partner", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await menu.evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await page.goto("/login");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("agency dialogs and mobile drawer contain focus; route changes focus the heading", async ({
  page,
}) => {
  expect(
    (
      await page.request.post("/api/auth", {
        headers: {
          Origin: "http://127.0.0.1:3000",
          "X-Forwarded-For": `a11y-keyboard-${Date.now()}`,
        },
        data: { demo: "agency" },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/agency/contacts");
  const add = page.getByRole("button", { name: "New contact", exact: true });
  await add.click();
  const dialog = page.getByRole("dialog", { name: "New contact", exact: true });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Save record" }).focus();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("dialog")),
  ).toBeTruthy();
  await scan(page);
  await dialog.getByRole("button", { name: "Save record" }).click();
  await expect(dialog.getByLabel("Full name", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(add).toBeFocused();
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name: "Invoices", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Invoices", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.getByRole("button", {
    name: "Open workspace navigation",
  });
  await toggle.click();
  const drawer = page.getByRole("dialog", { name: "Workspace navigation" });
  await expect(drawer).toBeVisible();
  await scan(page);
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
});

test("booking steps announce progress and move focus to the new form fields", async ({
  page,
}) => {
  await page.goto("/experiences/dacia-duster");
  const panel = page.locator(".booking-panel");
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 10);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 3);
  await panel
    .getByLabel("Pickup date", { exact: true })
    .fill(start.toISOString().slice(0, 10));
  await panel
    .getByLabel("Return date", { exact: true })
    .fill(end.toISOString().slice(0, 10));
  await panel
    .getByLabel("Pickup location", { exact: true })
    .fill("Marrakech airport");
  await panel.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(panel.getByRole("radio").first()).toBeFocused();
  await expect(panel.getByRole("status")).toHaveText("Step 2 of 3: Protection");
  await scan(page);
  await panel.getByRole("radio").first().check();
  await panel.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(panel.getByLabel("Full name", { exact: true })).toBeFocused();
  await expect(panel.getByRole("status")).toHaveText("Step 3 of 3: About you");
  await scan(page);
});

test("guest receipt, cancellation dialog and missing private access are accessible", async ({
  page,
}) => {
  test.skip(
    !process.env.TEST_MONGODB_URI,
    "Set TEST_MONGODB_URI for the isolated guest booking fixture.",
  );
  const client = await new MongoClient(process.env.TEST_MONGODB_URI!).connect();
  const db = client.db(process.env.TEST_MONGODB_DB || "atlas_journeys");
  const key = randomUUID();
  try {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 20);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 3);
    const response = await page.request.post("/api/bookings", {
      headers: {
        Origin: "http://127.0.0.1:3000",
        "X-Forwarded-For": `a11y-guest-${key}`,
      },
      data: {
        listingId: "dacia-duster",
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        name: "QA Accessibility Guest",
        email: "qa-accessibility@example.com",
        phone: "+212600000000",
        pickup: "Marrakech airport",
        returnCity: "Marrakech",
        guests: 1,
        protection: "essential",
        extras: 0,
        dob: "1990-01-01",
        licenceDate: "2010-01-01",
        notes: "Isolated accessibility fixture",
        consent: true,
        idempotencyKey: key,
      },
    });
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    await page.goto(`/booking/${result.booking.id}#${result.token}`);
    await expect(
      page.getByRole("heading", { name: "Request received. Adventure ahead." }),
    ).toBeVisible();
    await scan(page);
    await page
      .getByRole("button", { name: "Cancel request", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await scan(page);
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 320, height: 900 });
    await scan(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.goto("/booking/missing-accessibility-reference");
    await expect(
      page.getByRole("heading", {
        name: "Your private reservation space",
        exact: true,
      }),
    ).toBeVisible();
    await scan(page);
  } finally {
    await db.collection("bookings").deleteOne({ idempotencyKey: key });
    await client.close();
  }
});

test("cookie notice remains keyboard accessible and can be dismissed", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(
      page.getByRole("complementary", { name: "Cookie preferences" }),
    ).toBeVisible();
    await scan(page);
    const essential = page.getByRole("button", {
      name: "Essential only",
      exact: true,
    });
    await essential.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("complementary", { name: "Cookie preferences" }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
