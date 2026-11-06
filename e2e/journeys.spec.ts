import { selectDropdown } from "./support/select";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
const errors: string[] = [];
test.beforeEach(async ({ page, context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "X-Forwarded-For": `playwright-${testInfo.testId}-${Date.now()}`,
  });
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message
        .text()
        .includes(
          "Failed to load resource: the server responded with a status of 4",
        )
    )
      errors.push(message.text());
  });
  page.on("response", (res) => {
    if (res.status() >= 500) errors.push(`${res.status()} ${res.url()}`);
  });
  await page.addInitScript(() =>
    localStorage.setItem("atlas-cookie-choice", "essential"),
  );
});
test.afterEach(() => {
  expect(errors, "No browser errors or server failures").toEqual([]);
});
async function scan(page: Page) {
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      description: v.description,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
async function login(page: Page, role: "agency" | "platform") {
  await page.goto("/login");
  await page
    .getByRole("button", {
      name: role === "agency" ? "Agency demo" : "Platform demo",
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`/${role}$`));
  await expect(
    page.getByRole("heading", {
      name: role === "agency" ? /Welcome back/ : /Your platform/,
    }),
  ).toBeVisible();
}
function future(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
test("F-Partners/support: application, approval, manager provisioning and a support request", async ({
  page,
}) => {
  const suffix = Date.now();
  const business = `Coastal Collective ${suffix}`,
    email = `manager${suffix}@example.com`;
  await page.goto("/partners");
  await page.getByLabel("Business name", { exact: true }).fill(business);
  await page.getByLabel("Contact email", { exact: true }).fill(email);
  await page
    .getByLabel("Owner’s full name", { exact: true })
    .fill("Coastal Owner");
  await page.getByLabel("Phone number", { exact: true }).fill("+212 600000000");
  await page
    .getByLabel("WhatsApp number", { exact: true })
    .fill("+212 600000001");
  await selectDropdown(
    page.getByLabel("Your specialty", { exact: false }),
    "cars",
  );
  await selectDropdown(
    page.getByLabel("Primary city", { exact: false }),
    "Agadir",
  );
  await page
    .getByLabel("Commercial registration number", { exact: true })
    .fill(`QA-${suffix}`);
  await page.getByLabel("Fleet or service capacity", { exact: true }).fill("5");
  await page
    .getByLabel("Registration document", { exact: true })
    .setInputFiles({
      name: "qa-registration.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(
        "%PDF-1.4\n% Synthetic QA registration document\n%%EOF",
      ),
    });
  await page
    .getByLabel("A little about your business", { exact: true })
    .fill(
      "A local travel business offering thoughtfully managed city car rentals.",
    );
  await page.getByRole("checkbox", { name: /I am authorized/ }).check();
  await page
    .getByRole("checkbox", { name: /I accept the booking terms/ })
    .check();
  await page.getByRole("button", { name: "Send partner application" }).click();
  await expect(
    page.getByRole("heading", { name: "We’ve got your introduction." }),
  ).toBeVisible();
  await login(page, "platform");
  await page.getByRole("link", { name: /^Agencies/ }).click();
  const card = page
    .locator(".agency-card")
    .filter({ has: page.getByRole("heading", { name: business }) });
  await card.getByText("Review application details", { exact: true }).click();
  await expect(card.getByText(`QA-${suffix}`, { exact: true })).toBeVisible();
  const documentLink = card.getByRole("link", {
    name: "Download registration document",
  });
  const documentPath = await documentLink.getAttribute("href");
  const download = await page.request.get(documentPath!);
  expect(download.status()).toBe(200);
  expect(download.headers()["cache-control"]).toBe("private, no-store");
  expect((await download.body()).toString()).toContain(
    "Synthetic QA registration",
  );
  await card.getByRole("button", { name: "Approve agency" }).click();
  await expect(card.getByText("Active", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Create manager access" }).click();
  await page
    .getByLabel("Manager name", { exact: true })
    .fill("Coastal Manager");
  await page.getByLabel("Initial password").fill("PreviewOnly-2026!");
  await scan(page);
  await page.getByRole("button", { name: "Create agency manager" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get(documentPath!)).status()).toBe(403);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("PreviewOnly-2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back, Coastal/ }),
  ).toBeVisible();
  await expect(page.getByText(business, { exact: true })).toBeVisible();
  expect((await page.request.get(documentPath!)).status()).toBe(403);
  await expect(
    page.getByRole("heading", { name: "No reservations to show" }),
  ).toBeVisible();
  await page.goto("/support");
  await page.getByLabel("Your name", { exact: true }).fill("A sample traveler");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(`traveler${suffix}@example.com`);
  await selectDropdown(
    page.getByRole("combobox", { name: /What can we help/ }),
    "Planning my trip",
  );
  await page
    .getByLabel("Your message", { exact: true })
    .fill(
      `Sample planning request ${suffix}: could you help with an airport pickup?`,
    );
  await page.getByRole("checkbox", { name: /I agree/ }).check();
  await page.getByRole("button", { name: "Send your message" }).click();
  await expect(
    page.getByRole("heading", { name: "Your message is with us." }),
  ).toBeVisible();
  await login(page, "platform");
  await page.getByRole("link", { name: "Support inbox", exact: true }).click();
  const ticket = page
    .locator(".ticket-card")
    .filter({ hasText: `Sample planning request ${suffix}` });
  await expect(ticket).toBeVisible();
  await ticket.getByRole("button", { name: "Mark resolved" }).click();
  await expect(ticket.getByText("Resolved", { exact: true })).toBeVisible();
});
test("F01/F02: discover, request a car, reload private access, cancel", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Good journeys/ }),
  ).toBeVisible();
  await scan(page);
  await mkdir("replica/clone-screens", { recursive: true });
  await page.screenshot({
    path: "replica/clone-screens/home-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await page.getByRole("button", { name: "Find my journey" }).click();
  await expect(
    page.getByRole("heading", { name: "Your road. Your rhythm." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Dacia Duster/ })).toBeVisible();
  await page.getByLabel("Transmission", { exact: true }).count();
  await page.getByLabel("Automatic", { exact: true }).check();
  await expect(page.getByRole("link", { name: /Dacia Duster/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Reset filters" }).click();
  await scan(page);
  await page.getByRole("link", { name: /Dacia Duster/ }).click();
  await page.getByLabel("Pickup date", { exact: true }).fill(future(7));
  await page.getByLabel("Return date", { exact: true }).fill(future(11));
  await page
    .getByLabel("Pickup location", { exact: true })
    .fill("Marrakech airport, arrival hall");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: /Comfort/ }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Test Traveler");
  await page
    .getByLabel("Email", { exact: true })
    .fill("test.traveler@example.com");
  await page
    .getByLabel("Phone / WhatsApp", { exact: true })
    .fill("+212600123456");
  await page
    .getByLabel("Driver’s birth date", { exact: true })
    .fill("1990-04-12");
  await page
    .getByLabel("Licence issue date", { exact: true })
    .fill("2012-07-10");
  await page.getByRole("checkbox", { name: /I accept/ }).check();
  await scan(page);
  await page.getByRole("button", { name: "Send reservation request" }).click();
  await expect(
    page.getByRole("heading", { name: "Request received. Adventure ahead." }),
  ).toBeVisible();
  await expect(page.getByText("€228", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Request received. Adventure ahead." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel request", exact: true })
    .click();
  await page.getByRole("button", { name: "Yes, cancel request" }).click();
  await expect(
    page.getByRole("heading", { name: "Your request has been cancelled." }),
  ).toBeVisible();
  await scan(page);
});
test("F-Agency: dashboard, listing CRUD, reservation review, export, calendar, settings", async ({
  page,
}) => {
  const listingName = "Coastal runaround " + Date.now();
  await login(page, "agency");
  await expect(
    page.getByText("Atlas Mobility", { exact: true }).first(),
  ).toBeVisible();
  await scan(page);
  await page.screenshot({
    path: "replica/clone-screens/agency-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await page.getByRole("link", { name: "My listings", exact: true }).click();
  await page.getByRole("button", { name: "Add a listing" }).click();
  await page.getByLabel("Listing name", { exact: true }).fill(listingName);
  await page
    .getByLabel("Description", { exact: true })
    .fill("A comfortable local car for a relaxed trip around the coast.");
  await page.getByRole("button", { name: "Save listing" }).click();
  await expect(page.getByRole("heading", { name: listingName })).toBeVisible();
  const card = page
    .locator(".listing-card")
    .filter({ has: page.getByRole("heading", { name: listingName }) });
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await selectDropdown(
    page.getByLabel("Visibility", { exact: false }),
    "archived",
  );
  await page.getByRole("button", { name: "Save listing" }).click();
  await expect(card.getByText("Archived", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /^Reservations/ }).click();
  await page.getByRole("tab", { name: /Needs review/ }).click();
  const view = page.getByRole("button", { name: /View reservation/ }).first();
  if (await view.count()) {
    await view.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await scan(page);
    await page.getByRole("button", { name: "Approve availability" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export reservations" }).click();
  expect((await download).suggestedFilename()).toMatch(/atlas-reservations/);
  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next month" })).toBeVisible();
  await scan(page);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Yasmine");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("saved");
});
test("F-Platform: agency review, support inbox, responsive navigation", async ({
  page,
}) => {
  await login(page, "platform");
  await scan(page);
  await page.screenshot({
    path: "replica/clone-screens/platform-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await page.getByRole("link", { name: /^Agencies/ }).click();
  const agency = page
    .locator(".agency-card")
    .filter({ has: page.getByRole("heading", { name: "Northern Horizons" }) });
  if (await agency.getByRole("button", { name: "Approve agency" }).count()) {
    await agency.getByRole("button", { name: "Approve agency" }).click();
    await expect(agency.getByText("Active", { exact: true })).toBeVisible();
  }
  await scan(page);
  await page.getByRole("link", { name: "Support inbox", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little help goes a long way." }),
  ).toBeVisible();
  await scan(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/platform");
  await expect(
    page.getByRole("heading", { name: /Your platform/ }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "replica/clone-screens/platform-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  await scan(page);
  await page.getByRole("button", { name: "Open workspace navigation" }).click();
  await page.getByRole("link", { name: /^Agencies/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Local expertise. Shared possibilities.",
    }),
  ).toBeVisible();
});
test("F-Security: tenant isolation, guest token access, role boundaries, invalid pricing", async ({
  request,
}) => {
  const headers = {
    Origin: "http://127.0.0.1:3000",
    "X-Forwarded-For": `playwright-security-${Date.now()}`,
  };
  expect((await request.get("/api/workspace")).status()).toBe(401);
  expect(
    (
      await request.post("/api/auth", { headers, data: { demo: "agency" } })
    ).ok(),
  ).toBeTruthy();
  const data = await (await request.get("/api/workspace")).json();
  expect(
    data.bookings.every(
      (b: { agencyId: string }) => b.agencyId === "agency-atlas",
    ),
  ).toBeTruthy();
  expect(data.agencies).toHaveLength(1);
  expect(
    (
      await request.post("/api/workspace", {
        headers,
        data: { action: "agency", id: "agency-coast", status: "suspended" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/workspace", {
        headers,
        data: {
          action: "listing",
          id: "fiat-500",
          name: "Unauthorized change",
          category: "cars",
          city: "Agadir",
          price: 3000,
          seats: 4,
          transmission: "Manual",
          fuel: "Petrol",
          description: "A change that must never cross the agency boundary.",
          status: "published",
        },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.post("/api/workspace", {
        headers: { Origin: "https://evil.example" },
        data: { action: "settings", name: "Injected" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/booking-access", {
        headers,
        data: { id: "AJ-2401" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/bookings", {
        headers,
        data: { listingId: "dacia-duster", total: 1 },
      })
    ).status(),
  ).toBe(400);
  const payload = {
    listingId: "dacia-duster",
    start: future(7),
    end: future(11),
    name: "Test Idempotency Traveler",
    email: "idempotency.test@example.com",
    phone: "+212600123456",
    pickup: "Marrakech airport",
    returnCity: "Marrakech",
    guests: 1,
    protection: "comfort",
    extras: 0,
    dob: "1990-01-01",
    licenceDate: "2010-01-01",
    notes: "Synthetic idempotency and server-price check.",
    consent: true,
    idempotencyKey: crypto.randomUUID(),
    total: 1,
  };
  const created = await request.post("/api/bookings", {
    headers,
    data: payload,
  });
  expect(created.status()).toBe(201);
  const original = await created.json();
  expect(original.booking.total).toBe(22800);
  const replay = await request.post("/api/bookings", {
    headers,
    data: payload,
  });
  expect(replay.status()).toBe(200);
  const repeated = await replay.json();
  expect(repeated.booking.id).toBe(original.booking.id);
  expect(repeated.token).toBe(original.token);
  expect(
    (
      await request.post("/api/bookings", {
        headers,
        data: { ...payload, name: "Different traveler" },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/booking-access", {
        headers,
        data: { id: original.booking.id, token: original.token, cancel: true },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/workspace", {
        headers,
        data: {
          action: "booking",
          id: original.booking.id,
          status: "completed",
        },
      })
    ).status(),
  ).toBe(409);
});
test("F-Mobile: storefront, menu, catalog and booking panel fit 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "replica/clone-screens/home-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await scan(page);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Car rentals", exact: true }).click();
  await page.getByRole("button", { name: "Refine your search" }).click();
  await expect(page.getByLabel("Destination", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Dacia Duster/ }).click();
  await expect(
    page.getByRole("heading", { name: "Make it your own" }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await scan(page);
  await page.screenshot({
    path: "replica/clone-screens/booking-mobile.png",
    fullPage: true,
    caret: "initial",
  });
});
