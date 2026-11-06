import { selectDropdown } from "./support/select";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { rentalQuote } from "../src/lib/kracar/pricing";

const car = {
  id: "ux-car",
  agencyId: "ux-agency",
  name: "Test vehicle",
  city: "Marrakech",
  category: "suv",
  transmission: "automatic",
  fuel: "diesel",
  seats: 5,
  features: [],
  dailyRate: 200000,
  deposit: 500000,
  weeklyDiscount: 0,
  monthlyRate: null,
  rules: [],
  images: [{ src: "/images/duster.jpg", description: "Sample vehicle" }],
  conditions: {
    insurance: "Insurance and excess details",
    fuel: "Same fuel level",
  },
  extras: [
    {
      id: "airport",
      name: "Airport delivery",
      price: 15000,
      perDay: false,
      max: 1,
    },
  ],
  agency: {
    id: "ux-agency",
    name: "Test Partner",
    city: "Marrakech",
    business: { address: "Test address" },
    terms: {
      fr: "Conditions du partenaire pour la location de démonstration.",
    },
  },
};
const user = {
  id: "ux-client",
  name: "Test Client",
  email: "test@example.com",
  emailVerified: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const session = {
  user,
  session: {
    id: "ux-session",
    token: "test-only",
    userId: user.id,
    expiresAt: "2028-01-01T00:00:00Z",
    createdAt: user.createdAt,
    updatedAt: user.createdAt,
  },
};
const workspace = {
  actor: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: "customer",
    permissions: [],
  },
  bookings: [],
  vehicles: [],
  documents: [],
  payments: [],
  refunds: [],
  deposits: [],
  contracts: [],
  blocks: [],
  agencies: [],
  members: [],
  templates: [],
  notifications: [],
  auditEvents: [],
  ledgerEntries: [],
  handovers: [],
  walletRequests: [],
  payouts: [],
  verificationDocuments: [],
  emailPreviews: [],
};
const offer = "/cars/ux-car?start=2027-03-01T10%3A00&end=2027-03-02T10%3A00";
async function prepare(page: Page, signedIn = true) {
  await page
    .context()
    .addCookies([
      { name: "atlas-locale", value: "en", url: "http://127.0.0.1:3000" },
    ]);
  await page.addInitScript(() =>
    localStorage.setItem("atlas-cookie-choice", "essential"),
  );
  await page.route("**/api/customer-auth/**", async (route) => {
    if (route.request().url().includes("sign-in/email")) {
      signedIn = true;
      await route.fulfill({ json: { user, token: "test-only" } });
    } else await route.fulfill({ json: signedIn ? session : null });
  });
  await page.route("**/api/auth", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/rental-cars*", async (route) => {
    const q = new URL(route.request().url()).searchParams;
    if (q.get("quote")) {
      const quote = rentalQuote(
        car,
        new Date(q.get("start")!),
        new Date(q.get("end")!),
        JSON.parse(q.get("extras") || "{}"),
      );
      await route.fulfill({ json: quote });
    } else
      await route.fulfill({
        json: {
          cars: [car],
          total: 1,
          pages: 1,
          agencies: [car.agency],
          reviews: [],
        },
      });
  });
  await page.route("**/api/rental", (route) =>
    route.fulfill({ json: workspace }),
  );
}
async function pickCalendarDay(page: Page, day: string) {
  const calendar = page.getByRole("dialog");
  for (let attempt = 0; attempt < 24; attempt++) {
    const target = calendar.locator(`[data-calendar-day="${day}"]`);
    if (await target.count()) {
      await target.click();
      return;
    }
    const first = await calendar
      .locator("[data-calendar-day]")
      .first()
      .getAttribute("data-calendar-day");
    await calendar
      .getByRole("button", {
        name: first && day < first ? "Previous month" : "Next month",
        exact: true,
      })
      .click();
  }
  throw new Error("Date not reachable: " + day);
}
async function setCalendarField(page: Page, label: string, value: string) {
  await page
    .getByRole("button", { name: new RegExp("^" + label + " ") })
    .click();
  await pickCalendarDay(page, value.slice(0, 10));
  const calendar = page.getByRole("dialog");
  await selectDropdown(
    calendar.getByRole("combobox", { name: "Hour", exact: false }),
    value.slice(11, 13),
  );
  await selectDropdown(
    calendar.getByRole("combobox", { name: "Minutes", exact: false }),
    value.slice(14, 16),
  );
  await calendar
    .getByRole("button", { name: "Apply date", exact: true })
    .click();
}
async function fillDetails(page: Page) {
  await page.getByLabel("Phone number", { exact: true }).fill("+212600000000");
  await page
    .getByLabel("Billing address", { exact: true })
    .fill("Test billing address");
  await page
    .getByLabel("Driving licence number", { exact: true })
    .fill("TEST-LICENCE");
  await page
    .getByLabel("Pickup location", { exact: true })
    .fill("Marrakech airport");
  await page
    .getByLabel("Return location", { exact: true })
    .fill("Marrakech airport");
}
test("rental request progresses through details and review without charging or losing edits", async ({
  page,
}) => {
  await prepare(page);
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/rental", async (route) => {
    if (route.request().method() === "POST") {
      submitted = route.request().postDataJSON();
      await route.fulfill({ json: { reference: "KC-UX-TEST" } });
    } else await route.fulfill({ json: workspace });
  });
  await page.goto(offer);
  await expect(
    page.getByRole("heading", { name: "Choose your dates and options" }),
  ).toBeVisible();
  await expect(page.getByLabel("Phone number", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Continue to my details" }).click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    user.name,
  );
  await page.getByRole("button", { name: "Review my request" }).click();
  await expect(
    page.getByRole("heading", { name: "Who is travelling?" }),
  ).toBeVisible();
  await fillDetails(page);
  await page.getByRole("button", { name: "Review my request" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your request before sending" }),
  ).toBeVisible();
  await expect(page.getByText("Marrakech airport").first()).toBeVisible();
  await page.getByRole("button", { name: "Edit my details" }).click();
  await expect(page.getByLabel("Phone number", { exact: true })).toHaveValue(
    "+212600000000",
  );
  await page.getByRole("button", { name: "Review my request" }).click();
  await page
    .getByRole("checkbox", {
      name: "I accept the conditions for this booking.",
    })
    .check();
  await page.getByRole("button", { name: "Send my booking request" }).click();
  await expect(
    page.getByRole("heading", { name: "Your request has been sent" }),
  ).toBeVisible();
  expect(submitted?.quotedTotal).toBe(210000);
  expect(submitted?.acceptedTerms).toBe(true);
  await expect(
    page.getByText(
      "The partner will review availability. Your booking is not confirmed yet, and no payment has been taken.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Track my request", exact: true }),
  ).toHaveAttribute("href", "/account?tab=bookings");
});
test("sign-in preserves selected rental dates and extras", async ({ page }) => {
  await prepare(page, false);
  await page.goto(offer);
  await page.getByText("Add optional extras", { exact: true }).click();
  await page.getByRole("spinbutton").fill("1");
  await page
    .getByRole("button", { name: "Sign in to continue", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\?next=/);
  const next = new URL(page.url()).searchParams.get("next")!;
  expect(new URL(next, "http://localhost").searchParams.get("extras")).toBe(
    '{"airport":1}',
  );
  await page
    .getByLabel("Email address", { exact: true })
    .fill("test@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("A-test-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Who is travelling?" }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("start")).toBe(
    "2027-03-01T10:00",
  );
});
test("customer overview focuses on bookings and hides business finance metrics", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Your plans, and what comes next" }),
  ).toBeVisible();
  await expect(
    page.getByText("Accepted rental value", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your next trip starts with an offer" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".kc-customer-empty")
      .getByRole("link", { name: "Rent a car" }),
  ).toHaveAttribute("href", "/cars");
});
test("signed-in workspace failures offer retry without asking for another login", async ({
  page,
}) => {
  await prepare(page);
  await page.route("**/api/rental", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.goto("/account");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Your account is signed in",
  );
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
});
test("service choices work with the keyboard and calendar prevents reversed dates", async ({
  page,
}) => {
  await prepare(page, false);
  await page.goto("/");
  await page.getByRole("tab", { name: "Car rentals", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Things to do", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await setCalendarField(page, "Pickup date and time", "2027-03-03T10:00");
  await page.getByRole("button", { name: /^Return date and time / }).click();
  const calendar = page.getByRole("dialog");
  await expect(
    calendar.locator('[data-calendar-day="2027-03-02"]'),
  ).toBeDisabled();
  await calendar.locator('[data-calendar-day="2027-03-03"]').click();
  await expect(
    calendar.getByRole("button", { name: "Apply date", exact: true }),
  ).toBeDisabled();
  await selectDropdown(
    calendar.getByRole("combobox", { name: "Hour", exact: false }),
    "11",
  );
  await calendar
    .getByRole("button", { name: "Apply date", exact: true })
    .click();
  await page.getByRole("button", { name: "Find a car", exact: true }).click();
  await expect(page).toHaveURL(/\/cars\?/);
  expect(new URL(page.url()).searchParams.get("end")).toBe("2027-03-03T11:00");
});

test("booking form remains readable and accessible at mobile width", async ({
  page,
}) => {
  await prepare(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(offer);
  await expect(
    page.getByRole("button", { name: "Continue to my details" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".kc-mobile-request-link")).toBeVisible();
  await expect(page.locator(".floating-tools")).toBeHidden();
  const audit = await new AxeBuilder({ page })
    .include("#rental-request")
    .analyze();
  expect(
    audit.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page.screenshot({
    path: "output/ux-rental-mobile.png",
    fullPage: true,
  });
});
test("support carries the booking reference into the message", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("/support?reference=KC-UX-TEST");
  await expect(page.getByLabel("Your message", { exact: true })).toHaveValue(
    /KC-UX-TEST/,
  );
  await expect(
    page.getByRole("combobox", {
      name: "What can we help with?",
      exact: false,
    }),
  ).toHaveAttribute("data-value", "Existing reservation");
});
for (const locale of ["fr", "ar"] as const) {
  test(`rental journey fits a mobile screen in ${locale}`, async ({ page }) => {
    await prepare(page);
    await page
      .context()
      .addCookies([
        { name: "atlas-locale", value: locale, url: "http://127.0.0.1:3000" },
      ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(offer);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      locale === "ar" ? "rtl" : "ltr",
    );
    await expect(
      page.locator(".kc-booking-progress li[aria-current=step]"),
    ).toHaveCount(1);
    const positions = await page.evaluate(() => ({
      request: document
        .querySelector("#rental-request")!
        .getBoundingClientRect().top,
      conditions: document
        .querySelector("#partner-conditions")!
        .getBoundingClientRect().top,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    }));
    expect(positions.request).toBeLessThan(positions.conditions);
    expect(positions.overflow).toBe(false);
    const audit = await new AxeBuilder({ page })
      .include("#rental-request")
      .analyze();
    expect(
      audit.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
    await page.screenshot({
      path: `output/ux-rental-${locale}-mobile.png`,
      fullPage: true,
    });
  });
}
for (const locale of ["en", "fr", "ar"] as const) {
  test(`marketplace redesign has a clear responsive search in ${locale}`, async ({
    page,
  }) => {
    await prepare(page, false);
    await page
      .context()
      .addCookies([
        { name: "atlas-locale", value: locale, url: "http://127.0.0.1:3000" },
      ]);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".market-search")).toBeVisible();
    await expect(page.locator(".market-car-types a")).toHaveCount(5);
    await expect(page.locator(".market-place")).toHaveCount(3);
    expect(
      await page
        .locator(".market-search")
        .evaluate((element) => element.getBoundingClientRect().top),
    ).toBeLessThan(800);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const desktop = await new AxeBuilder({ page })
      .include(".market-home")
      .analyze();
    expect(
      desktop.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
    await page.screenshot({
      path: `output/design-home-${locale}-desktop.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.locator(".market-search-tabs button").first(),
    ).toBeVisible();
    const mobile = await new AxeBuilder({ page })
      .include(".market-home")
      .analyze();
    expect(
      mobile.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
    await page.screenshot({
      path: `output/design-home-${locale}-mobile.png`,
      fullPage: true,
    });
  });
}

test("custom calendar supports keyboard dates, 24-hour time, apply and cancel", async ({
  page,
}) => {
  await prepare(page, false);
  await page.goto("/");
  const original = await page.locator('input[name="start"]').inputValue();
  const trigger = page.getByRole("button", { name: /^Pickup date and time / });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Pickup date and time",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const selected = dialog.locator("[data-calendar-day].selected");
  const selectedDate = await selected.getAttribute("data-calendar-day");
  await expect(selected).toBeFocused();
  await selected.press("ArrowRight");
  await expect(dialog.locator("[data-calendar-day]:focus")).not.toHaveAttribute(
    "data-calendar-day",
    selectedDate!,
  );
  await page.keyboard.press("Enter");
  await expect(
    dialog.locator("[data-calendar-day].selected"),
  ).not.toHaveAttribute("data-calendar-day", selectedDate!);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.locator('input[name="start"]').inputValue()).toBe(original);
  await setCalendarField(page, "Pickup date and time", "2027-03-10T14:30");
  await expect(page.locator('input[name="start"]')).toHaveValue(
    "2027-03-10T14:30",
  );
  await trigger.click();
  const audit = await new AxeBuilder({ page })
    .include(".kc-calendar-dialog")
    .analyze();
  expect(
    audit.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page.screenshot({ path: "output/calendar-desktop.png" });
  await page.keyboard.press("Escape");
});
for (const locale of ["fr", "ar"] as const) {
  test(`custom calendar fits mobile and is accessible in ${locale}`, async ({
    page,
  }) => {
    await prepare(page, false);
    await page
      .context()
      .addCookies([
        { name: "atlas-locale", value: locale, url: "http://127.0.0.1:3000" },
      ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator(".kc-date-field").first().getByRole("button").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(845);
    await expect(dialog.locator("[data-calendar-day]")).toHaveCount(42);
    await dialog
      .locator(".kc-calendar-time-inputs [role=combobox]")
      .first()
      .click();
    await expect(page.getByRole("option")).toHaveCount(24);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    const audit = await new AxeBuilder({ page })
      .include(".kc-calendar-dialog")
      .analyze();
    expect(
      audit.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
    await page.screenshot({ path: `output/calendar-${locale}-mobile.png` });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
}
const calendarViewports = [
  { locale: "ar", width: 507, height: 503 },
  { locale: "ar", width: 760, height: 500 },
  { locale: "en", width: 900, height: 600 },
  { locale: "fr", width: 390, height: 568 },
  { locale: "ar", width: 390, height: 480 },
  { locale: "ar", width: 844, height: 390 },
  { locale: "ar", width: 390, height: 360 },
  { locale: "en", width: 1280, height: 720 },
] as const;
for (const viewport of calendarViewports) {
  test(`calendar needs no internal scrolling at ${viewport.width}x${viewport.height} (${viewport.locale})`, async ({
    page,
  }) => {
    await prepare(page, false);
    await page.context().addCookies([
      {
        name: "atlas-locale",
        value: viewport.locale,
        url: "http://127.0.0.1:3000",
      },
    ]);
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.clock.install({ time: new Date("2026-11-03T12:00:00Z") });
    await page.goto("/");
    await page.locator(".kc-date-field").first().getByRole("button").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    async function checkFit() {
      const size = await dialog.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const confirm = element
          .querySelector(".kc-calendar-apply")!
          .getBoundingClientRect();
        const time = element
          .querySelector(".kc-calendar-time")!
          .getBoundingClientRect();
        return {
          client: element.clientHeight,
          scroll: element.scrollHeight,
          top: rect.top,
          bottom: rect.bottom,
          applyTop: confirm.top,
          applyBottom: confirm.bottom,
          timeBottom: time.bottom,
        };
      });
      expect(
        size.scroll - size.client,
        JSON.stringify(size),
      ).toBeLessThanOrEqual(1);
      expect(size.top).toBeGreaterThanOrEqual(0);
      expect(size.bottom).toBeLessThanOrEqual(viewport.height);
      expect(size.applyTop).toBeGreaterThanOrEqual(size.top);
      expect(size.applyBottom).toBeLessThanOrEqual(size.bottom);
      expect(size.timeBottom).toBeLessThanOrEqual(size.bottom);
    }
    await checkFit();
    await dialog.locator(".kc-calendar-today").click();
    await selectDropdown(
      dialog.locator(".kc-calendar-time-inputs [role=combobox]").first(),
      "00",
    );
    await expect(dialog.locator(".kc-calendar-error")).toBeVisible();
    await checkFit();
    await page.screenshot({
      path: `output/calendar-fit-${viewport.locale}-${viewport.width}x${viewport.height}.png`,
    });
    const scrollBefore = await dialog.evaluate((element) => ({
      page: window.scrollY,
      picker: element.scrollTop,
    }));
    await dialog.locator(".kc-calendar-month").hover();
    await page.mouse.wheel(0, 300);
    expect(await dialog.evaluate((element) => element.scrollTop)).toBe(
      scrollBefore.picker,
    );
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore.page);
    await page.keyboard.press("Escape");
  });
}

test("custom dropdown keyboard selection submits the selected city", async ({
  page,
}) => {
  await prepare(page, false);
  await page.goto("/");
  const city = page.getByRole("combobox", { name: /^Pickup city / });
  await city.focus();
  await city.press("k");
  await expect(page.getByRole("option", { name: "Khenifra" })).toHaveAttribute(
    "data-active",
    "true",
  );
  await city.press("Enter");
  await expect(city).toContainText("Khenifra");
  await city.click();
  await expect(page.getByRole("option", { name: "Khenifra" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await city.press("Escape");
  await expect(city).toBeFocused();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page
    .locator(".market-search form")
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page).toHaveURL(/city=Khenifra/);
  await expect(
    page.getByRole("combobox", { name: /^Pickup city / }),
  ).toContainText("Khenifra");
});

test("language menu supports keyboard switching and RTL on mobile", async ({
  page,
}) => {
  await prepare(page, false);
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/");
  const language = page.getByRole("combobox", { name: /^Language / });
  await language.focus();
  await language.press("End");
  await language.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  const rtlLanguage = page.locator(".language-switcher [role=combobox]");
  await rtlLanguage.click();
  const menu = page.getByRole("listbox");
  await expect(menu).toHaveAttribute("dir", "rtl");
  const bounds = await menu.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(12);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(378);
  await page.screenshot({ path: "output/dropdown-language-mobile-ar.png" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await page.getByRole("option", { name: "Français" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test("city dropdown closes outside and filters immediately", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("/cars");
  const city = page.getByRole("combobox", { name: /^Pickup city / });
  await city.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await city.click();
  await page.getByRole("option", { name: "Khenifra" }).click();
  await expect(city).toContainText("Khenifra");
  await expect
    .poll(() => page.locator(".kc-filters [role=combobox]").count())
    .toBe(6);
  await city.click();
  await page.screenshot({ path: "output/dropdown-filters-desktop.png" });
});

test("rental editor uploads multiple photos, selects a cover and preserves them on save retry", async ({
  page,
}) => {
  await prepare(page);
  const vehicle = {
    ...car,
    plate: "QA-123",
    status: "draft",
    conditions: {
      ...car.conditions,
      cancellation: "Partner cancellation terms",
    },
  };
  const agencyWorkspace = {
    ...workspace,
    actor: {
      ...workspace.actor,
      role: "agency",
      agencyId: car.agencyId,
      permissions: ["vehicles"],
    },
    vehicles: [vehicle],
  };
  let saved: Record<string, unknown> | undefined;
  let saves = 0;
  let uploads = 0;
  await page.route("**/api/rental", async (route) => {
    if (route.request().method() === "POST") {
      saved = route.request().postDataJSON();
      saves++;
      await route.fulfill(
        saves === 1
          ? { status: 503, json: { error: "Please try again." } }
          : { json: { id: car.id } },
      );
    } else await route.fulfill({ json: agencyWorkspace });
  });
  await page.route("**/api/rental-media", (route) => {
    uploads++;
    return route.fulfill({
      json: {
        id: `photo-${uploads}`,
        src: `/api/rental-media/photo-${uploads}`,
      },
    });
  });
  await page.route("**/api/rental-media/*", (route) =>
    route.fulfill({
      path: "public/images/clio.jpg",
      contentType: "image/jpeg",
    }),
  );
  await page.goto("/account?tab=vehicles");
  await page.getByRole("button", { name: "Edit vehicle", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const picker = dialog.getByLabel("Add car photos", { exact: true });
  await expect(picker).toHaveAttribute("multiple", "");
  await picker.setInputFiles(
    Array.from({ length: 6 }, (_, i) => ({
      name: `car-${i}.png`,
      mimeType: "image/png",
      buffer: Buffer.from("photo"),
    })),
  );
  await expect(dialog.getByRole("alert")).toContainText("up to six");
  expect(uploads).toBe(0);
  await picker.setInputFiles([
    {
      name: "Exterior.png",
      mimeType: "image/png",
      buffer: Buffer.from("photo1"),
    },
    {
      name: "Interior.png",
      mimeType: "image/png",
      buffer: Buffer.from("photo2"),
    },
  ]);
  await expect(
    dialog.getByText("3 car photos selected", { exact: true }),
  ).toBeVisible();
  expect(uploads).toBe(2);
  await dialog
    .locator(".car-photo-tile")
    .nth(2)
    .getByRole("button", { name: "Use as cover" })
    .click();
  await expect(
    dialog.getByLabel("Photo description 1", { exact: true }),
  ).toHaveValue("Interior");
  await dialog
    .getByRole("button", { name: "Remove photo 2", exact: true })
    .click();
  await expect(
    dialog.getByText("2 car photos selected", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .include(".car-photo-picker")
    .analyze();
  expect(
    accessibility.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await dialog
    .locator(".car-photo-picker")
    .screenshot({ path: "output/multi-photo-editor-mobile.png" });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Please try again");
  await expect(
    dialog.getByLabel("Photo description 1", { exact: true }),
  ).toHaveValue("Interior");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(uploads).toBe(2);
  expect(saved?.images).toEqual([
    { src: "/api/rental-media/photo-2", description: "Interior" },
    { src: "/api/rental-media/photo-1", description: "Exterior" },
  ]);
});

test("customers can browse every saved car photo", async ({ page }) => {
  await prepare(page, false);
  const images = [
    { src: "/images/clio.jpg", description: "Vehicle exterior" },
    { src: "/images/fiat.jpg", description: "Vehicle interior" },
    { src: "/images/tiguan.jpg", description: "Vehicle boot" },
  ];
  await page.route("**/api/rental-cars*", async (route) => {
    if (new URL(route.request().url()).searchParams.has("quote"))
      return route.fallback();
    await route.fulfill({
      json: {
        cars: [{ ...car, images }],
        total: 1,
        pages: 1,
        agencies: [car.agency],
        reviews: [],
      },
    });
  });
  await page.goto(offer);
  await expect(
    page.getByRole("group", { name: "Car photo gallery" }).getByRole("button"),
  ).toHaveCount(3);
  await page.getByRole("button", { name: "View photo 3", exact: true }).click();
  await expect(page.locator(".kc-detail-photo img")).toHaveAttribute(
    "alt",
    "Vehicle boot",
  );
  await expect(
    page.getByRole("button", { name: "View photo 3", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

for (const skewed of [false, true]) {
  test(`server and browser hydrate consistently with ${skewed ? "a different browser date" : "the current date"}`, async ({
    page,
  }) => {
    await prepare(page, false);
    if (skewed) await page.clock.setFixedTime(new Date("2031-06-15T12:00:00Z"));
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (
        /hydrat|server rendered HTML|didn't match|did not match/i.test(
          message.text(),
        )
      )
        hydrationErrors.push(message.text());
    });
    page.on("pageerror", (error) => {
      if (/hydrat/i.test(error.message)) hydrationErrors.push(error.message);
    });
    for (const url of [
      "/",
      "/cars",
      offer,
      "/experiences/dacia-duster",
      "/support",
      "/explore?category=activities",
    ]) {
      const response = await page.goto(url);
      const html = await response!.text();
      await expect(
        page.locator(".language-switcher [role=combobox]"),
      ).toBeVisible();
      await page.locator(".language-switcher [role=combobox]").click();
      await expect(page.getByRole("listbox")).toBeVisible();
      await page.keyboard.press("Escape");
      expect(hydrationErrors, `Hydration errors on ${url}`).toEqual([]);
      const serverYear = html.match(/footer-bottom[^]*?(20\d{2})/)?.[1];
      if (serverYear)
        await expect(page.locator(".footer-bottom")).toContainText(serverYear);
      if (url === "/experiences/dacia-duster") {
        const serverMin = html.match(/type="date"[^>]*min="([^"]+)"/)?.[1];
        expect(serverMin).toBeTruthy();
        await expect(page.locator('input[type="date"]').first()).toBeEnabled();
        await expect(
          page.locator('input[type="date"]').first(),
        ).toHaveAttribute("min", serverMin!);
      }
    }
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`partner dropdowns preserve validation, form values and arrow padding in ${locale}`, async ({
    page,
  }) => {
    await prepare(page, false);
    await page
      .context()
      .addCookies([
        { name: "atlas-locale", value: locale, url: "http://127.0.0.1:3000" },
      ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/partners");
    const specialty = page
      .locator(".kc-dropdown")
      .filter({ has: page.locator('select[name="category"]') })
      .getByRole("combobox");
    const city = page
      .locator(".kc-dropdown")
      .filter({ has: page.locator('select[name="city"]') })
      .getByRole("combobox");
    await specialty.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    expect(
      await page
        .locator('select[name="category"]')
        .evaluate((select: HTMLSelectElement) => select.reportValidity()),
    ).toBe(false);
    await expect(specialty).toHaveAttribute("aria-invalid", "true");
    await expect(specialty).toBeFocused();
    await specialty.press("Home");
    await specialty.press("Enter");
    await expect(specialty).toHaveAttribute("data-value", "cars");
    await expect(specialty).not.toHaveAttribute("aria-invalid", "true");
    await selectDropdown(city, "Khenifra");
    expect(
      await specialty.evaluate((element) =>
        Object.fromEntries(new FormData(element.closest("form")!)),
      ),
    ).toMatchObject({ category: "cars", city: "Khenifra" });
    const gap = await specialty.evaluate((element) => {
      const rect = element.getBoundingClientRect(),
        arrow = element
          .querySelector("svg:last-child")!
          .getBoundingClientRect();
      return getComputedStyle(element).direction === "rtl"
        ? arrow.left - rect.left
        : rect.right - arrow.right;
    });
    expect(gap).toBeGreaterThanOrEqual(17);
    await specialty.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(
      page.locator('[role="option"][data-value=""]'),
    ).toHaveAttribute("aria-disabled", "true");
    const audit = await new AxeBuilder({ page })
      .include(".kc-dropdown")
      .include(".kc-select-menu")
      .analyze();
    expect(
      audit.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
    await page.screenshot({ path: `output/dropdown-partner-${locale}.png` });
    await page.keyboard.press("Escape");
    await specialty.evaluate((element) => element.closest("form")!.reset());
    await expect(specialty).toHaveAttribute("data-value", "");
  });
}
