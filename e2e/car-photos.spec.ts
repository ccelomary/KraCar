import { test, expect, type Page } from "@playwright/test";
import { MongoClient } from "mongodb";
import { randomUUID, scryptSync } from "node:crypto";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
async function accessibility(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(
    r.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
test("car photos persist privately in fleet and publish only through owned listings", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.TEST_MONGODB_URI,
    "Set TEST_MONGODB_URI for isolated photo fixtures.",
  );
  test.setTimeout(240000);
  const client = await new MongoClient(process.env.TEST_MONGODB_URI!).connect(),
    db = client.db(process.env.TEST_MONGODB_DB || "atlas_journeys"),
    key = randomUUID(),
    agencyIds = [`qa-photo-a-${key}`, `qa-photo-b-${key}`],
    emails = agencyIds.map((id) => `${id}@example.com`),
    password = randomUUID(),
    salt = randomUUID(),
    headers = {
      Origin: "http://127.0.0.1:3000",
      "X-Forwarded-For": `photos-${key}`,
    };
  const publicContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
    }),
    other = await browser.newContext({ baseURL: "http://127.0.0.1:3000" }),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await db.collection("agencies").insertMany(
      agencyIds.map((id, i) => ({
        id,
        name: `QA Photo Agency ${i}`,
        city: "Casablanca",
        email: emails[i],
        status: "active",
        joined: "2026-10-31",
        commission: 12,
      })),
    );
    await db.collection("users").insertMany(
      agencyIds.map((id, i) => ({
        id,
        agencyId: id,
        role: "agency",
        name: "QA Photo Manager",
        email: emails[i],
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
    const image = await readFile("public/images/duster.jpg");
    const image2 = await sharp(await readFile("public/images/clio.jpg"))
      .png()
      .toBuffer();
    await page.goto("/agency/vehicles");
    await page
      .getByRole("button", { name: "Add vehicle", exact: true })
      .click();
    await page.getByLabel("Add car photos", { exact: true }).setInputFiles([
      { name: "car-front.jpg", mimeType: "image/jpeg", buffer: image },
      { name: "car-side.png", mimeType: "image/png", buffer: image2 },
    ]);
    await expect(page.locator(".car-photo-tile")).toHaveCount(2, {
      timeout: 30000,
    });
    await page
      .getByLabel("Photo description 1", { exact: true })
      .fill("Rental car exterior");
    await page
      .getByRole("button", { name: "Use as cover", exact: true })
      .click();
    await page
      .getByLabel("Vehicle name", { exact: true })
      .fill("QA Photo Rental Car");
    await page
      .getByLabel("Registration plate", { exact: true })
      .fill("QA PHOTO 123");
    await accessibility(page);
    await expect
      .poll(() =>
        page
          .locator(".car-photo-preview img")
          .evaluateAll((images) =>
            images.every(
              (img) =>
                (img as HTMLImageElement).complete &&
                (img as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBeTruthy();
    await page.screenshot({
      path: "replica/clone-screens/car-photos-form.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 20000 });
    await page.reload();
    await expect(page.locator(".fleet-car-photo img")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(".fleet-car-photo img")
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      )
      .toBeTruthy();
    let records = await (await page.request.get("/api/management")).json();
    const vehicle = records.vehicles[0],
      photos = vehicle.photos;
    expect(photos).toHaveLength(2);
    expect(photos[0].description).toBe("");
    expect(photos[1].description).toBe("Rental car exterior");
    const asset = await db
      .collection("car_images")
      .findOne({ id: photos[0].id });
    expect(asset!.expiresAt).toBeUndefined();
    expect((await publicContext.request.get(photos[0].src)).status()).toBe(404);
    expect(
      (
        await other.request.post("/api/auth", {
          headers,
          data: { email: emails[1], password },
        })
      ).ok(),
    ).toBeTruthy();
    expect((await other.request.get(photos[0].src)).status()).toBe(404);
    expect(
      (
        await other.request.post("/api/management", {
          headers,
          data: { ...vehicle, id: randomUUID(), version: 0, action: "vehicle" },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await other.request.post("/api/car-images", {
          headers,
          multipart: {
            agencyId: agencyIds[0],
            photo: { name: "car.jpg", mimeType: "image/jpeg", buffer: image },
          },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/car-images", {
          headers,
          multipart: {
            agencyId: agencyIds[0],
            photo: {
              name: "fake.jpg",
              mimeType: "image/jpeg",
              buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
            },
          },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post("/api/car-images", {
          headers,
          multipart: {
            agencyId: agencyIds[0],
            photo: {
              name: "large.png",
              mimeType: "image/png",
              buffer: Buffer.alloc(6 * 1024 * 1024),
            },
          },
        })
      ).status(),
    ).toBe(413);
    await page.goto("/agency/fleet");
    await page
      .getByRole("button", { name: "Add a listing", exact: true })
      .click();
    await page
      .getByLabel("Listing name", { exact: true })
      .fill("QA Photo Rental Listing");
    await page
      .getByLabel("Description", { exact: true })
      .fill(
        "QA rental car with real uploaded images, prepared for an isolated workflow test.",
      );
    await page.getByLabel("Add car photos", { exact: true }).setInputFiles([
      { name: "rental-front.jpg", mimeType: "image/jpeg", buffer: image },
      { name: "rental-side.png", mimeType: "image/png", buffer: image2 },
    ]);
    await expect(page.locator(".car-photo-tile")).toHaveCount(2, {
      timeout: 30000,
    });
    await page
      .getByRole("button", { name: "Save listing", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 20000 });
    const workspace = await (
        await page.request.get("/api/workspace", { maxRetries: 2 })
      ).json(),
      listing = workspace.listings[0];
    expect(listing.photos).toHaveLength(2);
    expect(listing.image).toBe(listing.photos[0].src);
    const published = await publicContext.request.get(listing.photos[0].src);
    expect(published.ok()).toBeTruthy();
    expect(published.headers()["content-type"]).toBe("image/webp");
    const publicPage = await publicContext.newPage();
    await publicPage.addInitScript(() =>
      localStorage.setItem("atlas-cookie-choice", "essential"),
    );
    await publicPage.goto(`/experiences/${listing.id}`);
    await expect(
      publicPage.getByRole("group", { name: "Car photo gallery" }),
    ).toBeVisible();
    await publicPage
      .getByRole("button", { name: "View photo 2", exact: true })
      .click();
    await expect(
      publicPage.locator(".rental-photo-gallery").getByRole("status"),
    ).toHaveText("Photo 2 of 2");
    await accessibility(publicPage);
    await expect
      .poll(() =>
        publicPage
          .locator(".detail-image img")
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      )
      .toBeTruthy();
    await publicPage.screenshot({
      path: "replica/clone-screens/car-photos-public-gallery.png",
      fullPage: true,
    });
    await publicPage.setViewportSize({ width: 320, height: 900 });
    expect(
      await publicPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    expect(
      (
        await page.request.post("/api/workspace", {
          headers,
          data: { ...listing, action: "listing", status: "archived" },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (await publicContext.request.get(listing.photos[0].src)).status(),
    ).toBe(404);
    await page.goto("/agency/vehicles");
    await page
      .getByRole("button", { name: "Manage vehicle", exact: true })
      .click();
    await page.setViewportSize({ width: 320, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await accessibility(page);
    await page.screenshot({
      path: "replica/clone-screens/car-photos-form-mobile.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Remove photo 1", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    records = await (await page.request.get("/api/management")).json();
    expect(records.vehicles[0].photos).toHaveLength(1);
    await page.setViewportSize({ width: 390, height: 844 });
    await accessibility(page);
    await page.screenshot({
      path: "replica/clone-screens/car-photos-fleet-mobile.png",
      fullPage: true,
    });
    const platform = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
    });
    try {
      expect(
        (
          await platform.request.post("/api/auth", {
            headers,
            data: { demo: "platform" },
          })
        ).ok(),
      ).toBeTruthy();
      expect((await platform.request.get(photos[0].src)).ok()).toBeTruthy();
      expect(
        (
          await platform.request.post("/api/car-images", {
            headers,
            multipart: {
              agencyId: agencyIds[0],
              photo: {
                name: "admin-car.jpg",
                mimeType: "image/jpeg",
                buffer: image,
              },
            },
          })
        ).ok(),
      ).toBeTruthy();
    } finally {
      await platform.close();
    }
    expect(errors).toEqual([]);
  } finally {
    await other.close();
    await publicContext.close();
    for (const name of [
      "car_images",
      "vehicles",
      "listings",
      "audit",
      "bookings",
      "contacts",
      "invoices",
    ])
      await db.collection(name).deleteMany({ agencyId: { $in: agencyIds } });
    await db.collection("users").deleteMany({ id: { $in: agencyIds } });
    await db.collection("agencies").deleteMany({ id: { $in: agencyIds } });
    await client.close();
  }
});
