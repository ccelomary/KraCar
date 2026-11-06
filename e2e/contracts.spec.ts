import { selectDropdown } from "./support/select";
import { test, expect, type Page } from "@playwright/test";
import { MongoClient } from "mongodb";
import { randomUUID, scryptSync } from "node:crypto";
import { mkdir } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { today } from "../src/lib/catalog";

async function accessibility(page: Page) {
  const r = await new AxeBuilder({ page })
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
    r.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
}
test("agency contracts persist, issue immutably, print, record returns and enforce ownership", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.TEST_MONGODB_URI,
    "Set TEST_MONGODB_URI to create isolated contract fixtures.",
  );
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const client = await new MongoClient(process.env.TEST_MONGODB_URI!).connect(),
    db = client.db(process.env.TEST_MONGODB_DB || "atlas_journeys"),
    key = randomUUID(),
    agencyIds = [`qa-contract-a-${key}`, `qa-contract-b-${key}`],
    emails = agencyIds.map((id) => `${id}@example.com`),
    password = randomUUID(),
    salt = randomUUID(),
    headers = {
      Origin: "http://127.0.0.1:3000",
      "X-Forwarded-For": `contracts-${key}`,
    };
  const other = await browser.newContext(),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const contactId = randomUUID(),
    vehicleId = randomUUID(),
    invoiceId = randomUUID(),
    day = today(),
    pickup = new Date(day + "T00:00:00Z"),
    end = new Date(pickup);
  pickup.setUTCDate(pickup.getUTCDate() - 2);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = pickup.toISOString().slice(0, 10),
    finish = end.toISOString().slice(0, 10);
  try {
    await db.collection("agencies").insertMany(
      agencyIds.map((id, index) => ({
        id,
        name: `QA Contract Agency ${index}`,
        city: "Marrakech",
        email: emails[index],
        status: "active",
        joined: day,
        commission: 12,
        billingAddress: "QA agency billing address",
      })),
    );
    await db.collection("users").insertMany(
      agencyIds.map((id, index) => ({
        id,
        agencyId: id,
        role: "agency",
        name: "QA Contract Manager",
        email: emails[index],
        passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
      })),
    );
    expect(
      (
        await page.request.post("/api/auth", {
          headers,
          data: { email: emails[0], password },
        })
      ).ok(),
    ).toBeTruthy();
    const management = (data: Record<string, unknown>) =>
      page.request.post("/api/management", { headers, data });
    const contact = {
      action: "contact",
      id: contactId,
      version: 0,
      name: "QA Contract Customer",
      email: "qa-contract@example.com",
      phone: "+212600000000",
      company: "QA Company",
      address: "QA billing address",
      notes: "",
      status: "active",
    };
    expect((await management(contact)).ok()).toBeTruthy();
    const vehicle = {
      action: "vehicle",
      id: vehicleId,
      version: 0,
      name: "QA Contract Duster",
      plate: "QA CTR 123",
      listingId: "",
      city: "Marrakech",
      year: 2026,
      mileage: 50000,
      status: "available",
      insuranceDue: "",
      serviceDue: "",
      serviceMileage: 60000,
      notes: "",
    };
    expect((await management(vehicle)).ok()).toBeTruthy();
    expect(
      (
        await management({
          action: "invoice",
          id: invoiceId,
          version: 0,
          contactId,
          bookingId: "",
          issueDate: day,
          dueDate: day,
          currency: "MAD",
          notes: "QA invoice",
          items: [{ description: "QA rental", quantity: 3, unitPrice: 120000 }],
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (await management({ action: "issue", id: invoiceId, version: 1 })).ok(),
    ).toBeTruthy();
    await page.addInitScript(() =>
      localStorage.setItem("atlas-cookie-choice", "essential"),
    );
    await page.goto("/agency/contracts");
    await expect(
      page.getByRole("heading", { name: "Contracts", exact: true }),
    ).toBeVisible();
    await page.locator(".management-toolbar").waitFor();
    await accessibility(page);
    const shell = await page.locator(".sidebar").elementHandle();
    await page
      .getByRole("button", { name: "New contract", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "New contract",
      exact: true,
    });
    await selectDropdown(
      dialog.getByRole("combobox", { name: "Customer", exact: false }),
      contactId,
    );
    await selectDropdown(
      dialog.getByRole("combobox", { name: "Vehicle", exact: false }),
      vehicleId,
    );
    await dialog
      .getByLabel("Driving licence number", { exact: true })
      .fill("QA-DRIVING-LICENCE");
    await dialog.getByLabel("Pickup date", { exact: true }).fill(start);
    await dialog.getByLabel("Return date", { exact: true }).fill(finish);
    await dialog
      .getByLabel("Pickup location", { exact: true })
      .fill("QA airport pickup");
    await dialog
      .getByLabel("Return location", { exact: true })
      .fill("QA city return");
    await selectDropdown(
      dialog.getByRole("combobox", { name: "Currency", exact: false }),
      "MAD",
    );
    await dialog.getByLabel("Daily rental rate", { exact: true }).fill("1200");
    await dialog.getByLabel("Refundable deposit", { exact: true }).fill("2000");
    await selectDropdown(
      dialog.getByRole("combobox", {
        name: "Linked invoice (optional)",
        exact: false,
      }),
      invoiceId,
    );
    await dialog
      .getByLabel("Vehicle condition at pickup", { exact: true })
      .fill("QA clean vehicle, existing scratch on rear bumper.");
    await dialog
      .getByLabel("Agency rental terms", { exact: true })
      .fill(
        "QA agreed rental terms: return the vehicle to the agreed location with the recorded fuel level.",
      );
    await accessibility(page);
    await dialog
      .getByRole("button", { name: "Save contract", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "DRAFT — Not issued", exact: true }),
    ).toBeVisible();
    expect(await shell!.evaluate((el) => el.isConnected)).toBeTruthy();
    const records = () =>
      page.request.get("/api/contracts").then((r) => r.json());
    let contract = (await records())[0];
    expect(contract.total).toBe(360000);
    expect(contract.deposit).toBe(200000);
    expect(contract.days).toBe(3);
    expect(contract.currency).toBe("MAD");
    expect(contract.invoiceId).toBe(invoiceId);
    await page.getByRole("button", { name: "Edit draft", exact: true }).click();
    await page
      .getByLabel("Contract notes", { exact: true })
      .fill("QA agreed contract note");
    await page
      .getByRole("button", { name: "Save contract", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Issue contract", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: /CTR-\d{4}-00001/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit draft", exact: true }),
    ).toHaveCount(0);
    await accessibility(page);
    await page.screenshot({
      path: "replica/clone-screens/contracts-issued-desktop.png",
      fullPage: true,
    });
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".contract-document")).toBeVisible();
    const printBounds = await page
      .locator(".contract-document")
      .evaluate((el) => ({
        signatureBottom: el
          .querySelector(".contract-signatures")!
          .getBoundingClientRect().bottom,
        printBottom: el.closest("dialog")!.getBoundingClientRect().bottom,
      }));
    expect(printBounds.signatureBottom).toBeLessThanOrEqual(
      printBounds.printBottom + 1,
    );
    await page.screenshot({
      path: "replica/clone-screens/contracts-print.png",
      fullPage: true,
    });
    if (process.env.CONTRACT_PDF_PATH) {
      await mkdir("tmp/pdfs", { recursive: true });
      await page.pdf({
        path: process.env.CONTRACT_PDF_PATH,
        format: "A4",
        printBackground: true,
        tagged: true,
        outline: true,
      });
    }
    await page.emulateMedia({ media: "screen" });
    contract = (await records())[0];
    const post = (data: Record<string, unknown>) =>
      page.request.post("/api/contracts", { headers, data });
    expect(
      (await post({ ...contract, action: "save", dailyRate: 1 })).status(),
    ).toBe(409);
    expect(
      (
        await management({
          ...contact,
          version: 1,
          name: "QA Renamed Customer",
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (await management({ ...vehicle, version: 1, plate: "QA NEW 456" })).ok(),
    ).toBeTruthy();
    expect((await records())[0].customer.name).toBe("QA Contract Customer");
    expect((await records())[0].vehicle.plate).toBe("QA CTR 123");
    expect(
      (
        await post({
          action: "return",
          id: contract.id,
          version: contract.version,
          date: day,
          mileage: 49999,
          fuel: "full",
          condition: "QA invalid mileage",
        })
      ).status(),
    ).toBe(400);
    await page
      .getByRole("button", { name: "Record vehicle return", exact: true })
      .click();
    await page.getByLabel("Return mileage (km)", { exact: true }).fill("50200");
    await page
      .getByLabel("Vehicle condition at return", { exact: true })
      .fill("QA returned clean with the recorded scratch.");
    await page
      .getByRole("button", { name: "Save vehicle return", exact: true })
      .click();
    await expect(page.locator(".contract-document .badge")).toHaveText(
      "Returned",
    );
    const returned = (await records())[0];
    expect(returned.returned.mileage).toBe(50200);
    expect(returned.total).toBe(360000);
    expect(
      (
        await post({
          action: "void",
          id: returned.id,
          version: returned.version,
        })
      ).status(),
    ).toBe(409);
    const draft = {
      ...contract,
      action: "save",
      id: randomUUID(),
      version: 0,
      invoiceId: "",
      currency: "EUR",
      total: 1,
    };
    expect((await post(draft)).ok()).toBeTruthy();
    let second = (await records()).find(
      (c: { id: string }) => c.id === draft.id,
    );
    expect(second.total).toBe(360000);
    expect(second.currency).toBe("EUR");
    const race = await Promise.all(
      [1, 2].map(() =>
        post({ action: "issue", id: second.id, version: second.version }),
      ),
    );
    expect(race.map((r) => r.status()).sort()).toEqual([200, 409]);
    second = (await records()).find((c: { id: string }) => c.id === second.id);
    expect(
      (
        await post({ action: "void", id: second.id, version: second.version })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await post({ ...draft, id: randomUUID(), invoiceId, currency: "EUR" })
      ).status(),
    ).toBe(400);
    expect(
      (await post({ ...draft, id: randomUUID(), dailyRate: 0 })).status(),
    ).toBe(400);
    expect(
      (await other.request.get("http://127.0.0.1:3000/api/contracts")).status(),
    ).toBe(403);
    expect(
      (
        await other.request.post("http://127.0.0.1:3000/api/auth", {
          headers,
          data: { email: emails[1], password },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      await (
        await other.request.get("http://127.0.0.1:3000/api/contracts")
      ).json(),
    ).toEqual([]);
    expect(
      (
        await other.request.post("http://127.0.0.1:3000/api/contracts", {
          headers,
          data: { action: "issue", id: contract.id, version: contract.version },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await other.request.post("http://127.0.0.1:3000/api/contracts", {
          headers,
          data: { ...draft, id: randomUUID() },
        })
      ).status(),
    ).toBe(400);
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await page.reload();
    await expect(page.locator(".management-grid article")).toHaveCount(2);
    for (const locale of ["en", "fr", "ar"]) {
      await page
        .context()
        .addCookies([
          { name: "atlas-locale", value: locale, url: "http://127.0.0.1:3000" },
        ]);
      await page.goto("/agency/contracts");
      await page.setViewportSize({ width: 320, height: 900 });
      await expect(page.locator(".management-grid article")).toHaveCount(2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await accessibility(page);
      await page.screenshot({
        path: `replica/clone-screens/contracts-${locale}-mobile.png`,
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
  } finally {
    await other.close();
    for (const name of [
      "contracts",
      "contacts",
      "vehicles",
      "invoices",
      "audit",
      "listings",
      "bookings",
    ])
      await db.collection(name).deleteMany({ agencyId: { $in: agencyIds } });
    await db.collection("users").deleteMany({ id: { $in: agencyIds } });
    await db.collection("agencies").deleteMany({ id: { $in: agencyIds } });
    for (const name of ["invoice_counters", "contract_counters"])
      await db
        .collection<{ _id: string }>(name)
        .deleteMany({ _id: { $regex: `^qa-contract-[ab]-${key}:` } });
    await client.close();
  }
});
