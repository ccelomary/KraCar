import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { MongoMemoryReplSet } from "mongodb-memory-server";

test(
  "MongoDB rental core: auth, atomic inventory, rollback and nullable unique indexes",
  { timeout: 180000 },
  async () => {
    const mongo = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    process.env.KRACAR_MONGODB_URI = mongo.getUri("kracar_test");
    process.env.KRACAR_MONGODB_DB = "kracar_test";
    process.env.SESSION_SECRET =
      "mongo-integration-test-secret-at-least-32-characters";
    process.env.APP_ORIGIN = "http://127.0.0.1:3000";
    const { coreDb, coreTransaction } =
      await import("../../src/lib/kracar/client");
    const db = coreDb();
    try {
      const setup = spawn(
        process.execPath,
        ["node_modules/tsx/dist/cli.mjs", "scripts/setup-kracar-db.ts"],
        { env: process.env },
      );
      let output = "";
      setup.stdout.on("data", (chunk) => {
        output += chunk;
      });
      setup.stderr.on("data", (chunk) => {
        output += chunk;
      });
      const setupCode = await new Promise((resolve, reject) => {
        setup.on("error", reject);
        setup.on("exit", resolve);
      });
      assert.equal(setupCode, 0, output);
      const { customerAuth } = await import("../../src/lib/kracar/auth");
      const auth = customerAuth();
      const signup = await auth.api.signUpEmail({
        body: {
          name: "Mongo Customer",
          email: "mongo@example.com",
          password: "MongoTestPassword2026!",
        },
      });
      assert.ok(signup.user.id);
      const signin = await auth.api.signInEmail({
        body: {
          email: "mongo@example.com",
          password: "MongoTestPassword2026!",
        },
        asResponse: true,
      });
      assert.equal(signin.status, 200);
      const cookie = signin.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      const session = await auth.api.getSession({
        headers: new Headers({ cookie }),
      });
      assert.equal(session?.user.email, "mongo@example.com");
      for (const origin of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
        const response = await auth.handler(
          new Request(`${origin}/api/customer-auth/sign-in/email`, {
            method: "POST",
            headers: {
              origin,
              "content-type": "application/json",
              "sec-fetch-site": "same-origin",
            },
            body: JSON.stringify({
              email: "mongo@example.com",
              password: "MongoTestPassword2026!",
            }),
          }),
        );
        assert.equal(response.status, 200, await response.text());
      }
      const rejected = await auth.handler(
        new Request("http://localhost:3000/api/customer-auth/sign-in/email", {
          method: "POST",
          headers: {
            origin: "https://untrusted.example",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email: "mongo@example.com",
            password: "MongoTestPassword2026!",
          }),
        }),
      );
      assert.equal(rejected.status, 403);
      const testEnv: Record<string, string | undefined> = process.env;
      const previousNodeEnv = testEnv.NODE_ENV;
      testEnv.NODE_ENV = "production";
      process.env.APP_ORIGIN = "https://kracar.vercel.app";
      try {
        const productionAuth = customerAuth();
        for (const [origin, expected] of [
          ["https://kracar.vercel.app", 200],
          ["http://127.0.0.1:3000", 403],
        ] as const) {
          const response = await productionAuth.handler(
            new Request(
              "https://kracar.vercel.app/api/customer-auth/sign-in/email",
              {
                method: "POST",
                headers: { origin, "content-type": "application/json" },
                body: JSON.stringify({
                  email: "mongo@example.com",
                  password: "MongoTestPassword2026!",
                }),
              },
            ),
          );
          assert.equal(response.status, expected, await response.text());
        }
      } finally {
        if (previousNodeEnv === undefined) delete testEnv.NODE_ENV;
        else testEnv.NODE_ENV = previousNodeEnv;
        process.env.APP_ORIGIN = "http://127.0.0.1:3000";
      }

      await db.agency.create({
        data: {
          id: "agency-test",
          name: "Test",
          city: "Rabat",
          email: "agency@example.com",
          status: "active",
        },
      });
      await db.vehicle.create({
        data: {
          id: "car-test",
          agencyId: "agency-test",
          name: "Test car",
          plate: "TEST-1",
          city: "Rabat",
          dailyRate: 30000,
          status: "published",
        },
      });
      const { command } = await import("../../src/lib/kracar/service");
      const actor = {
        id: "staff-test",
        name: "Staff",
        email: "staff@example.com",
        role: "agency" as const,
        agencyId: "agency-test",
        permissions: ["*"],
      };
      const start = new Date(Date.now() + 86400000).toISOString();
      const end = new Date(Date.now() + 2 * 86400000).toISOString();
      const block = () =>
        command(actor, {
          action: "block.create",
          vehicleId: "car-test",
          start,
          end,
          reason: "maintenance",
        });
      const results = await Promise.allSettled([block(), block()]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(await db.availabilityBlock.count(), 1);
      await command(actor, {
        action: "block.create",
        vehicleId: "car-test",
        start: end,
        end: new Date(Date.now() + 3 * 86400000).toISOString(),
        reason: "adjacent",
      });
      assert.equal(await db.availabilityBlock.count(), 2);
      const bookingInput = {
        action: "booking.create",
        source: "direct",
        vehicleId: "car-test",
        start: new Date(Date.now() + 4 * 86400000).toISOString(),
        end: new Date(Date.now() + 5 * 86400000).toISOString(),
        customer: {
          name: "Renter",
          email: "renter@example.com",
          phone: "+212600000000",
        },
        pickup: "Rabat",
        dropoff: "Rabat",
      };
      const bookingResults = await Promise.allSettled([
        command(actor, { ...bookingInput, idempotencyKey: randomUUID() }),
        command(actor, { ...bookingInput, idempotencyKey: randomUUID() }),
      ]);
      assert.equal(
        bookingResults.filter((r) => r.status === "fulfilled").length,
        1,
      );
      assert.equal(await db.booking.count(), 1);
      assert.equal(await db.securityDeposit.count(), 1);
      const booking = await db.booking.findFirstOrThrow();
      await command(actor, {
        ...bookingInput,
        idempotencyKey: booking.idempotencyKey,
      });
      assert.equal(await db.booking.count(), 1);
      await assert.rejects(
        coreTransaction(async (tx) => {
          await tx.notification.create({
            data: { userId: "rollback", message: "must roll back" },
          });
          throw new Error("rollback");
        }),
      );
      assert.equal(
        await db.notification.count({ where: { userId: "rollback" } }),
        0,
      );

      const draft = {
        agencyId: "agency-test",
        kind: "invoice",
        snapshot: {},
        total: 10000,
        dueAt: new Date(),
      };
      await db.financialDocument.create({ data: draft });
      await db.financialDocument.create({ data: draft });
      const obligationKey = randomUUID();
      await db.financialDocument.create({
        data: { ...draft, obligationKey, number: "INV-1" },
      });
      await assert.rejects(
        db.financialDocument.create({
          data: { ...draft, obligationKey, number: "INV-2" },
        }),
      );
      await assert.rejects(
        db.financialDocument.create({ data: { ...draft, number: "INV-1" } }),
      );
      const invoice = await db.financialDocument.create({
        data: {
          ...draft,
          number: "PAY-1",
          status: "issued",
          bookingId: booking.id,
        },
      });
      const paymentInput = {
        action: "payment.record",
        invoiceId: invoice.id,
        amount: 10000,
        method: "cash",
        reference: "test-payment",
        eventKey: randomUUID(),
      };
      await Promise.all([
        command(actor, paymentInput),
        command(actor, paymentInput),
      ]);
      assert.equal(await db.payment.count(), 1);
      assert.equal(await db.paymentAllocation.count(), 1);
      assert.equal(
        (
          await db.financialDocument.findUniqueOrThrow({
            where: { id: invoice.id },
          })
        ).paid,
        10000,
      );
      assert.equal(
        await db.financialDocument.count({ where: { kind: "receipt" } }),
        1,
      );
      assert.equal(
        (await db.ledgerEntry.aggregate({ _sum: { amount: true } }))._sum
          .amount,
        0,
      );
      await assert.rejects(
        command(actor, { ...paymentInput, eventKey: randomUUID() }),
      );
    } finally {
      await db.$disconnect();
      await mongo.stop();
    }
  },
);
