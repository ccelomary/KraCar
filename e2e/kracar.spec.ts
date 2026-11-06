import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { demoSignature } from "../src/lib/kracar/payment-provider";
loadEnvConfig(process.cwd());
const origin = "http://127.0.0.1:3000",
  headers = { Origin: origin };
async function login(c: BrowserContext, email: string) {
  const r = await c.request.post("/api/customer-auth/sign-in/email", {
    headers,
    data: { email, password: "KraCarDemo2026!" },
  });
  expect(r.ok(), `Login ${email}: ${r.status()}`).toBeTruthy();
  await c.addCookies([{ name: "atlas-locale", value: "en", url: origin }]);
}
async function command(c: BrowserContext, data: Record<string, unknown>) {
  const r = await c.request.post("/api/rental", { headers, data });
  const v = await r.json();
  expect(r.ok(), `${data.action}: ${JSON.stringify(v)}`).toBeTruthy();
  return v;
}
async function scan(page: Page) {
  const a = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    a.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
const carData = (name: string) => ({
  action: "vehicle.save",
  name,
  plate: `QA-${randomUUID().slice(0, 8)}`,
  city: "Casablanca",
  category: "compact",
  transmission: "automatic",
  fuel: "diesel",
  seats: 5,
  features: ["air_conditioning"],
  dailyRate: 40000,
  deposit: 500000,
  weeklyDiscount: 500,
  monthlyRate: 900000,
  extras: [
    { id: "seat", name: "Child seat", price: 3000, perDay: true, max: 2 },
  ],
  conditions: {
    mileage: "200 km/day",
    insurance: "QA demo insurance; excess 5000 MAD",
    cancellation: "Cancellation requests reviewed by agency",
    fuel: "Same level",
  },
  images: [{ src: "/images/clio.jpg", description: "QA illustrative car" }],
  status: "published",
});
test.describe("KraCar verified core", () => {
  test.beforeEach(() => {
    test.skip(
      !process.env.TEST_KRACAR_DATABASE?.includes("/kracar_test"),
      "Run only with an isolated local kracar_test database.",
    );
  });
  test("customer request, atomic approval, signed versions, invoices, demo callbacks, credits, refund and return", async ({
    browser,
    page,
  }) => {
    test.setTimeout(240000);
    const agency = await browser.newContext({ baseURL: origin }),
      customer = await browser.newContext({ baseURL: origin }),
      other = await browser.newContext({ baseURL: origin }),
      staff = await browser.newContext({ baseURL: origin });
    const db = new PrismaClient({
      datasourceUrl: process.env.TEST_KRACAR_DATABASE!,
    });
    try {
      await login(agency, "agence@kracar.example");
      await login(customer, "client@kracar.example");
      await login(other, "partenaire@kracar.example");
      await login(staff, "equipe@kracar.example");
      const car = await command(
        agency,
        carData(`QA KraCar ${randomUUID().slice(0, 6)}`),
      );
      const customerPage = await customer.newPage();
      await customerPage.addInitScript(() =>
        localStorage.setItem("atlas-cookie-choice", "essential"),
      );
      await customerPage.goto(`/cars/${car.id}`);
      await expect(
        customerPage.getByRole("heading", { name: car.name, exact: true }),
      ).toBeVisible();
      await expect(
        customerPage.getByText("Refundable security deposit", { exact: true }),
      ).toBeVisible();
      for (const [label, value] of [
        ["Full name", "QA Rental Customer"],
        ["Email address", "client@kracar.example"],
        ["Phone number", "0600000000"],
        ["Driving licence number", "DEMO-LICENCE"],
        ["Address", "QA demo address"],
        ["Pickup location", "Casablanca airport"],
        ["Return location", "Casablanca airport"],
      ])
        await customerPage.getByLabel(label, { exact: true }).fill(value);
      await customerPage
        .getByLabel("I have read the rental and cancellation conditions.")
        .check();
      await customerPage
        .getByRole("button", { name: "Request this car", exact: true })
        .click();
      await expect(
        customerPage.getByRole("heading", {
          name: "Request received",
          exact: true,
        }),
      ).toBeVisible();
      const workspace = await (
        await customer.request.get("/api/rental")
      ).json();
      const requested = workspace.bookings.find(
        (b: { vehicleId: string }) => b.vehicleId === car.id,
      );
      const duplicate = await command(customer, {
        action: "booking.create",
        vehicleId: car.id,
        start: requested.start,
        end: requested.end,
        customer: {
          name: "QA Rental Customer",
          email: "client@kracar.example",
          phone: "0600000000",
        },
        pickup: "Casablanca",
        dropoff: "Casablanca",
        idempotencyKey: randomUUID(),
      });
      const approvals = await Promise.all(
        [requested, duplicate].map((b) =>
          agency.request.post("/api/rental", {
            headers,
            data: {
              action: "booking.transition",
              id: b.id,
              status: "approved",
              version: 1,
            },
          }),
        ),
      );
      expect(approvals.map((r) => r.status()).sort()).toEqual([200, 409]);
      const winner =
          (await approvals[0].status()) === 200 ? requested : duplicate,
        loser = winner.id === requested.id ? duplicate : requested;
      expect(
        (
          await other.request.post("/api/rental", {
            headers,
            data: {
              action: "booking.transition",
              id: winner.id,
              status: "cancelled",
              version: 2,
            },
          })
        ).status(),
      ).toBe(403);
      const unavailable = await (
        await page.request.get(
          `/api/rental-cars?id=${car.id}&start=${encodeURIComponent(winner.start)}&end=${encodeURIComponent(winner.end)}`,
        )
      ).json();
      expect(unavailable.cars).toHaveLength(0);
      const contract = await command(agency, {
        action: "contract.prepare",
        bookingId: winner.id,
        language: "fr",
        clauses:
          "QA demo clauses for professional review. Same fuel level on return. Refundable deposit separate from rental revenue.",
      });
      const version = await db.contractVersion.findFirstOrThrow({
        where: { contractId: contract.id },
      });
      await command(customer, {
        action: "contract.sign",
        versionId: version.id,
        party: "customer",
        signer: "QA Customer",
        evidence: "I accept this precise version for the QA demonstration.",
        consent: true,
      });
      await command(agency, {
        action: "contract.sign",
        versionId: version.id,
        party: "agency",
        signer: "QA Agency",
        evidence: "Accepted on behalf of the demonstration agency.",
        consent: true,
      });
      expect(
        (
          await other.request.get(
            `/api/rental-documents/${version.id}?kind=contract`,
          )
        ).status(),
      ).toBe(403);
      expect(
        (
          await staff.request.get(
            `/api/rental-documents/${version.id}?kind=contract`,
          )
        ).status(),
      ).toBe(403);
      await expect(
        db.contractVersion.update({
          where: { id: version.id },
          data: { language: "ar" },
        }),
      ).rejects.toThrow();
      const amendment = await command(agency, {
        action: "contract.prepare",
        bookingId: winner.id,
        language: "ar",
        clauses:
          "هذا نموذج تجريبي يتطلب مراجعة مهنية. تعاد السيارة بمستوى الوقود نفسه. مبلغ الضمان مستقل عن ثمن الكراء.",
      });
      expect(amendment.currentVersion).toBe(2);
      expect(
        await db.signature.count({ where: { versionId: version.id } }),
      ).toBe(2);
      const invoice = await command(agency, {
        action: "document.prepare",
        bookingId: winner.id,
        kind: "invoice",
        dueAt: new Date(Date.now() + 86400000).toISOString(),
      });
      const issued = await command(agency, {
        action: "document.issue",
        id: invoice.id,
      });
      expect(issued.number).toMatch(/^INVOICE-/);
      const duplicateInvoice = await command(agency, {
        action: "document.prepare",
        bookingId: winner.id,
        kind: "invoice",
        dueAt: new Date().toISOString(),
      });
      expect(
        (
          await agency.request.post("/api/rental", {
            headers,
            data: { action: "document.issue", id: duplicateInvoice.id },
          })
        ).status(),
      ).toBe(409);
      const amount = Math.floor(invoice.total / 2),
        event = {
          id: randomUUID(),
          invoiceId: invoice.id,
          amount,
          reference: "SIMULATED QA payment",
          status: "succeeded",
        },
        body = JSON.stringify(event),
        signature = demoSignature(
          body,
          process.env.DEMO_CALLBACK_SECRET || process.env.SESSION_SECRET || "",
        );
      const callbacks = await Promise.all(
        [1, 2].map(() =>
          page.request.post("/api/demo-payment-callback", {
            data: body,
            headers: {
              "Content-Type": "application/json",
              "x-kracar-signature": signature,
            },
          }),
        ),
      );
      expect(callbacks.every((r) => r.ok())).toBeTruthy();
      expect(await db.payment.count({ where: { eventKey: event.id } })).toBe(1);
      const payment = await db.payment.findUniqueOrThrow({
        where: { eventKey: event.id },
      });
      expect(
        (
          await db.financialDocument.findUniqueOrThrow({
            where: { id: invoice.id },
          })
        ).paid,
      ).toBe(amount);
      const credit = await command(agency, {
        action: "credit.issue",
        invoiceId: invoice.id,
        amount: 1000,
        reason: "QA price correction",
      });
      const refund = await command(customer, {
        action: "refund.request",
        paymentId: payment.id,
        amount: 1000,
        reason: "QA credit refund",
        eventKey: randomUUID(),
      });
      await command(agency, {
        action: "refund.approve",
        id: refund.id,
        reference: "QA external refund recorded",
      });
      expect(
        (
          await customer.request.post("/api/rental", {
            headers,
            data: {
              action: "refund.request",
              paymentId: payment.id,
              amount: invoice.total,
              reason: "Invalid excessive refund",
              eventKey: randomUUID(),
            },
          })
        ).status(),
      ).toBe(400);
      const entries = await db.ledgerEntry.groupBy({
        by: ["eventKey"],
        _sum: { amount: true },
      });
      expect(entries.every((e) => e._sum.amount === 0)).toBeTruthy();
      await command(agency, {
        action: "deposit.update",
        bookingId: winner.id,
        operation: "receive",
        amount: 500000,
        reason: "QA deposit receipt",
      });
      const beforeCollections = await db.payment.aggregate({
        _sum: { amount: true },
      });
      await command(agency, {
        action: "deposit.update",
        bookingId: winner.id,
        operation: "retain",
        amount: 1000,
        reason: "Documented condition deduction tied to signed contract",
      });
      const afterCollections = await db.payment.aggregate({
        _sum: { amount: true },
      });
      expect(afterCollections).toEqual(beforeCollections);
      await command(agency, {
        action: "handover.save",
        bookingId: winner.id,
        kind: "pickup",
        mileage: 10000,
        fuel: "Full",
        equipment: "Two keys",
        damage: [],
        notes: "QA pickup",
      });
      await command(agency, {
        action: "booking.transition",
        id: winner.id,
        status: "in_progress",
        version: 2,
      });
      await command(agency, {
        action: "handover.save",
        bookingId: winner.id,
        kind: "return",
        mileage: 10200,
        fuel: "Full",
        equipment: "Two keys",
        damage: [],
        notes: "QA return",
      });
      await command(agency, {
        action: "booking.transition",
        id: winner.id,
        status: "completed",
        version: 3,
      });
      await command(customer, {
        action: "review.create",
        bookingId: winner.id,
        rating: 5,
        comment: "QA completed rental review.",
      });
      expect(
        (
          await customer.request.post("/api/rental", {
            headers,
            data: {
              action: "review.create",
              bookingId: loser.id,
              rating: 5,
              comment: "Not completed",
            },
          })
        ).ok(),
      ).toBeFalsy();
      await mkdir("output/pdf", { recursive: true });
      const arVersion = await db.contractVersion.findFirstOrThrow({
          where: { contractId: contract.id, version: 2 },
        }),
        receipt = await db.financialDocument.findFirstOrThrow({
          where: { kind: "receipt", originalId: payment.id },
        });
      for (const [id, kind, language, name] of [
        [version.id, "contract", "fr", "kracar-contract-fr"],
        [arVersion.id, "contract", "ar", "kracar-contract-ar"],
        [invoice.id, "document", "fr", "kracar-invoice-fr"],
        [invoice.id, "document", "ar", "kracar-invoice-ar"],
        [credit.id, "document", "fr", "kracar-credit-note"],
        [receipt.id, "document", "fr", "kracar-receipt"],
      ]) {
        const response = await agency.request.get(
          `/api/rental-documents/${id}?kind=${kind}&language=${language}&format=pdf`,
          { timeout: 60000 },
        );
        expect(response.ok(), name).toBeTruthy();
        await writeFile(`output/pdf/${name}.pdf`, await response.body());
      }
      await customerPage.goto("/account?tab=documents");
      await expect(
        customerPage.getByRole("heading", {
          name: "Quotations and invoices",
          exact: true,
        }),
      ).toBeVisible();
      await scan(customerPage);
      await customerPage.screenshot({
        path: "replica/clone-screens/kracar-customer-documents.png",
        fullPage: true,
      });
    } finally {
      await db.$disconnect();
      await agency.close();
      await customer.close();
      await other.close();
      await staff.close();
    }
  });
  test("direct rentals, B2B ownership, verification, wallet holds and responsive dashboards", async ({
    browser,
    page,
  }) => {
    test.setTimeout(180000);
    const agency = await browser.newContext({ baseURL: origin }),
      partner = await browser.newContext({ baseURL: origin }),
      admin = await browser.newContext({ baseURL: origin }),
      staff = await browser.newContext({ baseURL: origin });
    try {
      await login(agency, "agence@kracar.example");
      await login(partner, "partenaire@kracar.example");
      await login(admin, "admin@kracar.example");
      await login(staff, "equipe@kracar.example");
      const car = await command(
          agency,
          carData(`QA Direct ${randomUUID().slice(0, 6)}`),
        ),
        start = new Date(Date.now() + 10 * 86400000).toISOString(),
        end = new Date(Date.now() + 13 * 86400000).toISOString();
      const direct = await command(agency, {
        action: "booking.create",
        source: "direct",
        vehicleId: car.id,
        start,
        end,
        customer: {
          name: "QA External Client",
          email: "external@example.com",
          phone: "0600000000",
        },
        pickup: "Office",
        dropoff: "Office",
        recordedAmount: 80000,
        idempotencyKey: randomUUID(),
      });
      expect(direct.quote.serviceFee).toBe(0);
      expect(direct.quote.agencyCommission).toBe(0);
      expect(direct.quote.prepayment).toBe(0);
      expect(
        (
          await agency.request.post("/api/rental", {
            headers,
            data: {
              action: "block.create",
              vehicleId: car.id,
              start,
              end,
              reason: "maintenance",
            },
          })
        ).status(),
      ).toBe(409);
      const blockStart = new Date(Date.now() + 20 * 86400000).toISOString(),
        blockEnd = new Date(Date.now() + 21 * 86400000).toISOString();
      await command(agency, {
        action: "block.create",
        vehicleId: car.id,
        start: blockStart,
        end: blockEnd,
        reason: "maintenance",
      });
      const hidden = await (
        await page.request.get(
          `/api/rental-cars?id=${car.id}&start=${encodeURIComponent(blockStart)}&end=${encodeURIComponent(blockEnd)}`,
        )
      ).json();
      expect(hidden.cars).toHaveLength(0);
      const b2b = await command(partner, {
        action: "booking.create",
        source: "b2b",
        vehicleId: car.id,
        start: new Date(Date.now() + 30 * 86400000).toISOString(),
        end: new Date(Date.now() + 32 * 86400000).toISOString(),
        customer: {
          name: "QA Secret External Client",
          email: "private@example.com",
          phone: "0600000000",
        },
        pickup: "Office",
        dropoff: "Office",
        idempotencyKey: randomUUID(),
      });
      const received = await (await agency.request.get("/api/rental")).json();
      expect(
        JSON.stringify(
          received.bookings.find((b: { id: string }) => b.id === b2b.id)
            .customer,
        ),
      ).not.toContain("private@example.com");
      await command(agency, {
        action: "booking.transition",
        id: b2b.id,
        status: "approved",
        version: 1,
      });
      expect(
        (
          await staff.request.post("/api/rental", {
            headers,
            data: {
              action: "member.save",
              email: "equipe@kracar.example",
              permissions: ["finance"],
            },
          })
        ).status(),
      ).toBe(403);
      const staffData = await (await staff.request.get("/api/rental")).json();
      expect(staffData.payments).toHaveLength(0);
      expect(staffData.contracts).toHaveLength(0);
      expect(staffData.documents).toHaveLength(0);
      const photo = await readFile("public/images/clio.jpg"),
        upload = await agency.request.post("/api/rental-media", {
          headers,
          multipart: {
            kind: "verification",
            file: {
              name: "registration.jpg",
              mimeType: "image/jpeg",
              buffer: photo,
            },
          },
        });
      expect(upload.ok()).toBeTruthy();
      const object = await upload.json();
      expect((await partner.request.get(object.src)).status()).toBe(404);
      expect((await page.request.get(object.src)).status()).toBe(404);
      const adminData = await (await admin.request.get("/api/rental")).json(),
        document = adminData.verificationDocuments.find(
          (d: { storageId: string }) => d.storageId === object.id,
        );
      await command(admin, {
        action: "verification.review",
        id: document.id,
        status: "approved",
        reason: "QA fictional document checked",
      });
      const deposit = await command(agency, {
        action: "wallet.deposit-request",
        amount: 100000,
        reference: "QA external transfer",
      });
      await command(admin, {
        action: "wallet.approve-deposit",
        id: deposit.id,
        reference: "QA confirmed external transfer",
      });
      const payout = await command(agency, {
        action: "wallet.payout-request",
        amount: 20000,
        reference: "QA payout",
      });
      await command(admin, {
        action: "wallet.payout-record",
        id: payout.id,
        reference: "QA cancellation",
        cancel: true,
      });
      expect(
        (
          await agency.request.post("/api/rental", {
            headers,
            data: {
              action: "wallet.payout-request",
              amount: 100000000,
              reference: "Excessive",
            },
          })
        ).status(),
      ).toBe(400);
      const agencyPage = await agency.newPage();
      await agencyPage.addInitScript(() =>
        localStorage.setItem("atlas-cookie-choice", "essential"),
      );
      await agencyPage.goto("/account?tab=calendar");
      await expect(
        agencyPage.getByRole("heading", {
          name: "Fleet calendar",
          exact: true,
        }),
      ).toBeVisible();
      await scan(agencyPage);
      await agencyPage.screenshot({
        path: "replica/clone-screens/kracar-agency-calendar.png",
        fullPage: true,
      });
      for (const locale of ["fr", "ar"]) {
        await agency.addCookies([
          { name: "atlas-locale", value: locale, url: origin },
        ]);
        await agencyPage.setViewportSize({ width: 390, height: 844 });
        await agencyPage.goto("/account?tab=payments");
        await expect(agencyPage.locator(".kc-work-main")).toBeVisible();
        await scan(agencyPage);
        expect(
          await agencyPage.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBeTruthy();
        await agencyPage.screenshot({
          path: `replica/clone-screens/kracar-${locale}-mobile.png`,
          fullPage: true,
        });
      }
    } finally {
      await agency.close();
      await partner.close();
      await admin.close();
      await staff.close();
    }
  });
});
