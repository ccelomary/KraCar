import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const browserErrors: string[] = [];
async function scan(page: import("@playwright/test").Page) {
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
test("partner endpoint rejects disguised and oversized documents", async ({
  request,
}) => {
  const fields = {
    name: "Synthetic invalid document test",
    owner: "QA Owner",
    email: `document-${Date.now()}@example.com`,
    phone: "+212 600000000",
    whatsapp: "+212 600000001",
    city: "Agadir",
    category: "cars",
    registration: "QA-INVALID",
    fleetSize: "2",
    description:
      "Synthetic validation request that must never create an agency.",
    authority: "on",
    consent: "on",
  };
  const headers = {
    Origin: "http://127.0.0.1:3000",
    "X-Forwarded-For": `qa-document-${Date.now()}`,
  };
  const forged = await request.post("/api/partners", {
    headers,
    multipart: {
      ...fields,
      document: {
        name: "document.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("<html>not a PDF</html>"),
      },
    },
  });
  expect(forged.status()).toBe(400);
  const oversized = await request.post("/api/partners", {
    headers,
    multipart: {
      ...fields,
      document: {
        name: "large.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.alloc(6 * 1024 * 1024),
      },
    },
  });
  expect(oversized.status()).toBe(413);
});
test.beforeEach(async ({ page, context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "X-Forwarded-For": `playwright-${testInfo.testId}-${Date.now()}`,
  });
  browserErrors.length = 0;
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500)
      browserErrors.push(`${response.status()} ${response.url()}`);
  });
  await page.addInitScript(() =>
    localStorage.setItem("atlas-cookie-choice", "essential"),
  );
});
test.afterEach(() => expect(browserErrors).toEqual([]));
test("localized partner links preserve the host and in-progress application", async ({
  page,
}) => {
  await page.goto("/ar/list-your-property");
  await expect(page).toHaveURL("http://127.0.0.1:3000/partners");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("combobox", { name: /^اللغة / }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page
    .getByLabel("Business name", { exact: true })
    .fill("In-progress business");
  await page
    .getByLabel("Registration document", { exact: true })
    .setInputFiles({
      name: "invalid.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("<html>Not a real registration document</html>"),
    });
  await page.getByRole("combobox", { name: /^Language / }).click();
  await page.getByRole("option", { name: "Français", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator('input[name="name"]')).toHaveValue(
    "In-progress business",
  );
  await expect(page.getByText("invalid.pdf", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#apply").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  const violations = (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;
  expect(
    violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
});
test("travel guides, FAQs and a drop-off city connect to the reservation journey", async ({
  page,
}) => {
  await page.goto("/blog");
  await scan(page);
  await page.getByRole("link", { name: /Make room for the road/ }).click();
  await expect(
    page.getByRole("heading", { name: "Make room for the road", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Keep the practical details together" }),
  ).toBeVisible();
  await scan(page);
  await page.goto("/faq");
  await page
    .getByText("Is my reservation confirmed immediately?", { exact: true })
    .click();
  await expect(
    page.getByText(/Sending a request does not confirm/),
  ).toBeVisible();
  await scan(page);
  await page.goto("/");
  await page.getByRole("combobox", { name: /^Where are you headed/ }).click();
  await page.getByRole("option", { name: "Marrakech", exact: true }).click();
  await page.getByRole("combobox", { name: /Drop-off location/ }).click();
  await page.getByRole("option", { name: "Agadir", exact: true }).click();
  await page.getByRole("button", { name: "Find my journey" }).click();
  await expect(page).toHaveURL(/\/explore\?/);
  await expect(
    page.getByRole("link", { name: /Dacia Duster/ }),
  ).toHaveAttribute("href", /returnCity=Agadir/);
  await page.getByRole("link", { name: /Dacia Duster/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Return city", exact: false }),
  ).toHaveAttribute("data-value", "Agadir");
  await scan(page);
});
