import { selectDropdown } from "./support/select";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page, context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "X-Forwarded-For": `playwright-${testInfo.testId}-${Date.now()}`,
  });
  await page.addInitScript(() =>
    localStorage.setItem("atlas-cookie-choice", "essential"),
  );
});
async function accessibility(page: Page) {
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
function future(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
test("browser language sets the initial server render; explicit cookie takes precedence", async ({
  browser,
}) => {
  const context = await browser.newContext({
    locale: "fr-FR",
    baseURL: "http://127.0.0.1:3000",
    extraHTTPHeaders: { "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5" },
  });
  const page = await context.newPage();
  const response = await page.goto("/");
  expect(await response!.text()).toContain("Les beaux voyages");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await context.addCookies([
    { name: "atlas-locale", value: "ar", url: "http://127.0.0.1:3000" },
  ]);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("heading", { name: /الرحلات الجميلة/ }),
  ).toBeVisible();
  await context.close();
});
test("switching languages preserves search and booking state, canonical values and private booking access", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await selectDropdown(
    page.getByRole("combobox", { name: "Destination", exact: false }),
    "Marrakech",
  );
  await page.getByLabel("Pickup date", { exact: true }).fill(future(8));
  await page.getByLabel("Return date", { exact: true }).fill(future(12));
  await selectDropdown(
    page.getByRole("combobox", { name: "Language", exact: false }),
    "fr",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(
    page.getByRole("combobox", { name: "Destination", exact: false }),
  ).toHaveAttribute("data-value", "Marrakech");
  await expect(page.getByLabel("Date de départ", { exact: true })).toHaveValue(
    future(8),
  );
  await expect(page).toHaveTitle(/Le Maroc, à votre rythme/);
  await accessibility(page);
  await page.screenshot({
    path: "replica/clone-screens/home-fr.png",
    fullPage: true,
    caret: "initial",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Trouver mon voyage" }).click();
  await expect(page).toHaveURL(/city=Marrakech/);
  await page
    .getByRole("checkbox", { name: "Automatique", exact: true })
    .check();
  await expect(
    page.getByRole("link", { name: "Voir Dacia Duster à Marrakech" }),
  ).toHaveCount(0);
  await selectDropdown(
    page.getByRole("combobox", { name: "Langue", exact: false }),
    "ar",
  );
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("checkbox", { name: "أوتوماتيكي", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "إعادة ضبط الفلاتر", exact: true })
    .click();
  await page.getByRole("link", { name: "عرض Dacia Duster في مراكش" }).click();
  await expect(page).toHaveURL(/\/experiences\/dacia-duster/, {
    timeout: 15000,
  });
  await expect(page.getByLabel("تاريخ الاستلام", { exact: true })).toHaveValue(
    future(8),
  );
  await page
    .getByLabel("مكان الاستلام", { exact: true })
    .fill("مطار مراكش، قاعة الوصول");
  await page.getByRole("button", { name: "متابعة", exact: true }).click();
  await selectDropdown(
    page.getByRole("combobox", { name: "اللغة", exact: false }),
    "fr",
  );
  await expect(page.getByRole("radio", { name: /Confort/ })).toBeVisible();
  await page.getByRole("radio", { name: /Confort/ }).check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page
    .getByLabel("Nom complet", { exact: true })
    .fill("Language Test Traveler");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("language.test@example.com");
  await page
    .getByLabel("Téléphone / WhatsApp", { exact: true })
    .fill("+212600123456");
  await page
    .getByLabel("Date de naissance du conducteur", { exact: true })
    .fill("1990-02-10");
  await page
    .getByLabel("Date de délivrance du permis", { exact: true })
    .fill("2012-03-12");
  await page.getByRole("checkbox", { name: /J’accepte/ }).check();
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/bookings") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Envoyer la demande", exact: true })
    .click();
  const result = await (await created).json();
  expect(result.booking.returnCity).toBe("Marrakech");
  expect(result.booking.pickup).toBe("مطار مراكش، قاعة الوصول");
  expect(result.booking.total).toBe(22800);
  await expect(
    page.getByRole("heading", {
      name: "Demande reçue. L’aventure vous attend.",
    }),
  ).toBeVisible();
  await selectDropdown(
    page.getByRole("combobox", { name: "Langue", exact: false }),
    "ar",
  );
  await expect(
    page.getByRole("heading", { name: "وصل طلبك. والمغامرة تنتظرك." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "نسخ الرابط الخاص" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "وصل طلبك. والمغامرة تنتظرك." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "إلغاء الطلب", exact: true }).click();
  await page.getByRole("button", { name: "نعم، إلغاء الطلب" }).click();
  await expect(
    page.getByRole("heading", { name: "تم إلغاء طلبك." }),
  ).toBeVisible();
  await accessibility(page);
  expect(errors).toEqual([]);
});
test("French agency and Arabic platform dashboards remain usable on desktop and mobile", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "atlas-locale", value: "fr", url: "http://127.0.0.1:3000" },
  ]);
  await page.goto("/login");
  await page.getByRole("button", { name: "Démo agence" }).click();
  await expect(page.getByRole("heading", { name: /Bon retour/ })).toBeVisible();
  await accessibility(page);
  await page.screenshot({
    path: "replica/clone-screens/agency-fr.png",
    fullPage: true,
    caret: "initial",
    animations: "disabled",
  });
  await page.getByRole("link", { name: "Mes offres", exact: true }).click();
  const listing = page
    .locator(".listing-card")
    .filter({ has: page.getByRole("heading", { name: "Dacia Duster" }) });
  await listing.getByRole("button", { name: "Modifier", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("combobox", { name: /Catégorie/ }),
  ).toHaveAttribute("data-value", "cars");
  await page.getByRole("button", { name: "Enregistrer l’offre" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/login");
  await selectDropdown(
    page.getByRole("combobox", { name: "Langue", exact: false }),
    "ar",
  );
  await page.getByRole("button", { name: "تجربة المنصة" }).click();
  await expect(
    page.getByRole("heading", { name: /منصتك في لمحة/ }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await accessibility(page);
  await page.screenshot({
    path: "replica/clone-screens/platform-ar.png",
    fullPage: true,
    caret: "initial",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () =>
      document.querySelector(".sidebar")!.getBoundingClientRect().left >=
      window.innerWidth,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await accessibility(page);
  await page.screenshot({
    path: "replica/clone-screens/platform-ar-mobile.png",
    fullPage: true,
    caret: "initial",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "فتح قائمة مساحة العمل" }).click();
  const sidebar = page.locator(".sidebar");
  await expect(sidebar).toHaveClass(/is-open/);
  await expect
    .poll(async () =>
      Math.round(
        await sidebar.evaluate((el) => el.getBoundingClientRect().right),
      ),
    )
    .toBe(390);
  await page.getByRole("link", { name: /^الوكالات/ }).click();
  await expect(
    page.getByRole("heading", { name: "خبرة محلية وإمكانات مشتركة." }),
  ).toBeVisible();
});
