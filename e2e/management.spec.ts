import { test, expect } from "@playwright/test";
import { MongoClient } from "mongodb";
import { randomUUID, scryptSync } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";

test("agency contacts, physical fleet and invoicing persist with tenant and concurrency protection", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.TEST_MONGODB_URI,
    "Set TEST_MONGODB_URI to the local development database to run isolated management fixtures.",
  );
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const client = await new MongoClient(process.env.TEST_MONGODB_URI!).connect();
  const db = client.db(process.env.TEST_MONGODB_DB || "atlas_journeys");
  const key = randomUUID();
  const agencyIds = [`qa-management-a-${key}`, `qa-management-b-${key}`];
  const password = randomUUID();
  const salt = randomUUID();
  const headers = {
    Origin: "http://127.0.0.1:3000",
    "X-Forwarded-For": `management-${key}`,
  };
  const emails = agencyIds.map((id) => `${id}@example.com`);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const other = await browser.newContext();
  try {
    await db.collection("agencies").insertMany(
      agencyIds.map((id, index) => ({
        id,
        name: `QA Management ${index}`,
        city: "Marrakech",
        email: emails[index],
        status: "active",
        joined: "2026-10-30",
        commission: 12,
      })),
    );
    await db.collection("users").insertMany(
      agencyIds.map((id, index) => ({
        id,
        agencyId: id,
        role: "agency",
        name: "QA Manager",
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
    await page.addInitScript(() =>
      localStorage.setItem("atlas-cookie-choice", "essential"),
    );
    await page.goto("/agency/contacts");
    await expect(
      page.getByRole("heading", { name: "Contacts", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "New contact", exact: true })
      .click();
    await page
      .getByLabel("Full name", { exact: true })
      .fill("QA Rental Customer");
    await page
      .getByLabel("Email", { exact: true })
      .fill("qa-customer@example.com");
    await page.getByLabel("Phone", { exact: true }).fill("+212600000001");
    await page.getByLabel("Company", { exact: true }).fill("QA Company");
    await page
      .getByLabel("Billing address", { exact: true })
      .fill("QA Street, Marrakech");
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "QA Rental Customer" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "QA Rental Customer" }),
    ).toBeVisible();
    await page.screenshot({
      path: "replica/clone-screens/management-contacts-desktop.png",
      fullPage: true,
    });
    let records = await (await page.request.get("/api/management")).json();
    const contact = records.contacts[0];
    await page.goto("/agency/vehicles");
    await page
      .getByRole("button", { name: "Add vehicle", exact: true })
      .click();
    await page
      .getByLabel("Vehicle name", { exact: true })
      .fill("QA Dacia Duster");
    await page
      .getByLabel("Registration plate", { exact: true })
      .fill("QA 1234");
    await page.getByLabel("Mileage (km)", { exact: true }).fill("51000");
    await page.getByLabel(/^Next service mileage/).fill("50000");
    await page.getByLabel("Operating status").selectOption("maintenance");
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Service due", { exact: true })).toBeVisible();
    await page.screenshot({
      path: "replica/clone-screens/management-fleet-desktop.png",
      fullPage: true,
    });
    await page.goto("/agency/invoices");
    await page
      .getByRole("button", { name: "New invoice", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Customer", exact: true })
      .selectOption(contact.id);
    await page.getByLabel("Description", { exact: true }).fill("Car rental");
    await page.getByLabel("Quantity", { exact: true }).fill("2");
    await page.getByLabel("Unit price", { exact: true }).fill("50");
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "DRAFT — Not issued" }),
    ).toBeVisible();
    const issuedResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/management") &&
        response.request().method() === "POST" &&
        response.request().postDataJSON()?.action === "issue",
    );
    await page
      .getByRole("button", { name: "Issue invoice", exact: true })
      .click();
    expect((await issuedResponse).ok()).toBeTruthy();
    await expect(
      page.getByRole("heading", { name: /INV-\d{4}-00001/ }),
    ).toBeVisible({ timeout: 15000 });
    await page
      .getByRole("button", { name: "Record payment", exact: true })
      .click();
    await page.getByLabel("Payment amount", { exact: true }).fill("40");
    await page
      .getByLabel("Payment reference", { exact: true })
      .fill("QA Bank transfer");
    await page
      .getByRole("button", { name: "Save payment", exact: true })
      .click();
    await expect(
      page.getByRole("dialog").getByText("Partially paid", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: "replica/clone-screens/management-invoice-desktop.png",
      fullPage: true,
    });
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".invoice-document")).toBeVisible();
    await page.screenshot({
      path: "replica/clone-screens/management-invoice-print.png",
      fullPage: true,
    });
    await page.emulateMedia({ media: "screen" });
    const post = (data: Record<string, unknown>) =>
      page.request.post("/api/management", { headers, data });
    records = await (await page.request.get("/api/management")).json();
    const invoice = records.invoices[0],
      vehicle = records.vehicles[0];
    expect(invoice.total).toBe(10000);
    expect(invoice.paid).toBe(4000);
    expect(
      (
        await post({
          ...contact,
          action: "contact",
          name: "QA Renamed Customer",
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await post({
          ...invoice,
          action: "invoice",
          items: [{ description: "Tampered", quantity: 1, unitPrice: 1 }],
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await post({
          action: "payment",
          id: invoice.id,
          version: invoice.version,
          amount: 6001,
          date: invoice.issueDate,
          reference: "Too much",
        })
      ).status(),
    ).toBe(400);
    const race = await Promise.all(
      [1, 2].map(() =>
        post({
          action: "payment",
          id: invoice.id,
          version: invoice.version,
          amount: 3000,
          date: invoice.issueDate,
          reference: "QA concurrent payment",
        }),
      ),
    );
    expect(race.map((r) => r.status()).sort()).toEqual([200, 409]);
    const updated = (await (await page.request.get("/api/management")).json())
      .invoices[0];
    expect(updated.paid).toBe(7000);
    expect(updated.customer.name).toBe("QA Rental Customer");
    expect(
      (
        await post({ action: "void", id: invoice.id, version: updated.version })
      ).status(),
    ).toBe(409);
    expect(
      (
        await post({
          ...vehicle,
          action: "vehicle",
          id: randomUUID(),
          version: 0,
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await other.request.get("http://127.0.0.1:3000/api/management")
      ).status(),
    ).toBe(403);
    expect(
      (
        await other.request.post("http://127.0.0.1:3000/api/auth", {
          headers,
          data: { email: emails[1], password },
        })
      ).ok(),
    ).toBeTruthy();
    const privateRecords = await (
      await other.request.get("http://127.0.0.1:3000/api/management")
    ).json();
    expect(privateRecords).toEqual({
      contacts: [],
      vehicles: [],
      invoices: [],
    });
    expect(
      (
        await other.request.post("http://127.0.0.1:3000/api/management", {
          headers,
          data: { ...contact, action: "contact", name: "Cross tenant edit" },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await other.request.post("http://127.0.0.1:3000/api/management", {
          headers,
          data: { ...invoice, action: "invoice", id: randomUUID(), version: 0 },
        })
      ).status(),
    ).toBe(400);
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await page.reload();
    await expect(
      page
        .locator(".management-grid")
        .getByText("Partially paid", { exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const section of ["contacts", "vehicles", "invoices"]) {
      await page.goto(`/agency/${section}`);
      await expect(page.locator(".management-grid article")).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        axe.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      await page.screenshot({
        path: `replica/clone-screens/management-${section}-mobile.png`,
        fullPage: true,
      });
    }
    // The selected currency is retained without conversion; totals always come from line items.
    const madId = randomUUID();
    const madDraft = {
      action: "invoice",
      id: madId,
      version: 0,
      contactId: contact.id,
      bookingId: "",
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: "MAD",
      notes: "QA MAD invoice",
      items: [{ description: "Rental in MAD", quantity: 2, unitPrice: 25000 }],
      total: 1,
    };
    expect((await post(madDraft)).ok()).toBeTruthy();
    let mad = (
      await (await page.request.get("/api/management")).json()
    ).invoices.find((i: { id: string }) => i.id === madId);
    expect(mad.currency).toBe("MAD");
    expect(mad.total).toBe(50000);
    expect(
      (await post({ action: "issue", id: mad.id, version: mad.version })).ok(),
    ).toBeTruthy();
    mad = (
      await (await page.request.get("/api/management")).json()
    ).invoices.find((i: { id: string }) => i.id === madId);
    expect(mad.number).toMatch(/00002$/);
    expect(
      (await post({ action: "void", id: mad.id, version: mad.version })).ok(),
    ).toBeTruthy();
    expect(
      (
        await post({
          action: "payment",
          id: updated.id,
          version: updated.version,
          amount: 3000,
          date: invoice.issueDate,
          reference: "QA final balance",
        })
      ).ok(),
    ).toBeTruthy();
    const paid = (
      await (await page.request.get("/api/management")).json()
    ).invoices.find((i: { id: string }) => i.id === updated.id);
    expect(paid.paid).toBe(paid.total);
    expect(
      (
        await post({
          action: "payment",
          id: paid.id,
          version: paid.version,
          amount: 1,
          date: invoice.issueDate,
          reference: "QA overpayment",
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await post({
          ...madDraft,
          id: randomUUID(),
          items: [{ description: "Zero", quantity: 1, unitPrice: 0 }],
        })
      ).status(),
    ).toBe(400);
    expect(errors).toEqual([]);
  } finally {
    await other.close();
    for (const collection of [
      "contacts",
      "vehicles",
      "invoices",
      "audit",
      "listings",
      "bookings",
    ])
      await db
        .collection(collection)
        .deleteMany({ agencyId: { $in: agencyIds } });
    await db.collection("users").deleteMany({ id: { $in: agencyIds } });
    await db.collection("agencies").deleteMany({ id: { $in: agencyIds } });
    await db.collection<{ _id: string }>("invoice_counters").deleteMany({
      _id: {
        $in: agencyIds.map((id) => `${id}:${new Date().getFullYear()}`),
      },
    });
    await client.close();
  }
});
