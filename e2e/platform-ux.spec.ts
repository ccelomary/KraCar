import { selectDropdown } from "./support/select";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
let errors: string[] = [];
test.beforeEach(async ({ page, context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "X-Forwarded-For": `playwright-${testInfo.testId}-${Date.now()}`,
  });
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Platform demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Your platform/ }),
  ).toBeVisible();
});
test.afterEach(() => expect(errors).toEqual([]));
async function scan(page: Page) {
  await expect(page).toHaveTitle(/\S/);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
test("work queues open filtered views and reservation pages reset with filters", async ({
  page,
}) => {
  await scan(page);
  const queue = page.getByRole("link", {
    name: /Reservation requests Check availability/,
  });
  await queue.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/bookings\?status=requested/);
  await expect(
    page.getByRole("combobox", { name: "Filter by reservation status" }),
  ).toHaveAttribute("data-value", "requested");
  await expect(
    page.locator(".reservation-desktop tbody tr .badge").first(),
  ).toHaveText("Requested");
  await page.getByRole("tab", { name: /All reservations/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Filter by reservation status" }),
  ).toHaveAttribute("data-value", "all");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText(/Page 2 of/)).toBeVisible();
  await page.getByRole("tab", { name: /Needs review/ }).click();
  await expect(page.getByText(/Page 1 of 1/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Filter by reservation status" }),
  ).toHaveAttribute("data-value", "requested");
  await scan(page);
});
test("agency filters have useful empty states and suspension requires confirmation", async ({
  page,
}) => {
  await page.goto("/platform/agencies");
  await expect(
    page.getByRole("heading", { name: "Atlas Mobility", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Awaiting review/ }).click();
  await expect(page).toHaveURL(/status=pending/);
  await page
    .getByRole("textbox", { name: "Search agencies", exact: true })
    .fill("NoSuchAgency987");
  await expect(
    page.getByRole("heading", { name: "No agencies match this view" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  const agency = page.locator(".agency-card").filter({
    has: page.getByRole("heading", { name: "Atlas Mobility", exact: true }),
  });
  await agency.getByRole("button", { name: "Suspend", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "its listings will be hidden",
  );
  await scan(page);
  await page
    .getByRole("button", { name: "Keep agency active", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(agency.getByText("Active", { exact: true })).toBeVisible();
  const count = await page.locator(".agency-card").count();
  await page.getByPlaceholder("Find a reservation…").fill("Nora");
  await expect(page.locator(".agency-card")).toHaveCount(count);
  await page.screenshot({
    path: "replica/clone-screens/platform-refresh-agencies.png",
    fullPage: true,
  });
});
test("support filters, mobile navigation and Arabic layouts remain usable", async ({
  page,
}) => {
  await page.goto("/platform/support");
  await page
    .getByRole("textbox", { name: "Search support messages" })
    .fill("NoSuchMessage987");
  await expect(
    page.getByRole("heading", { name: "No messages match this view" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".ticket-card").first()).toBeVisible();
  await scan(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/platform");
  await selectDropdown(
    page.getByRole("combobox", { name: "Language", exact: false }),
    "ar",
  );
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await scan(page);
  await page.screenshot({
    path: "replica/clone-screens/platform-refresh-ar-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "فتح قائمة مساحة العمل" }).click();
  await expect(
    page.getByRole("navigation", { name: "التنقل في مساحة العمل" }),
  ).toBeVisible();
  await scan(page);
});
