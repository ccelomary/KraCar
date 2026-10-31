import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { processCarPhoto } from "../src/lib/car-photo-processing";
import { carPhotosSchema, photoLimit } from "../src/lib/car-photos";

test("car photos are resized, re-encoded and stripped of source metadata", async () => {
  const source = await sharp({
    create: { width: 2200, height: 1400, channels: 3, background: "#267865" },
  })
    .jpeg()
    .withExif({ IFD0: { Artist: "Private source metadata" } })
    .toBuffer();
  const result = await processCarPhoto(source, "image/jpeg"),
    metadata = await sharp(result.bytes).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(result.width <= 1600 && result.height <= 1200);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
});
test("photo uploads reject oversized, disguised and unreadable image content", async () => {
  await assert.rejects(() =>
    processCarPhoto(Buffer.alloc(photoLimit + 1), "image/png"),
  );
  await assert.rejects(() =>
    processCarPhoto(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      "image/jpeg",
    ),
  );
  await assert.rejects(() =>
    processCarPhoto(Buffer.from([255, 216, 255, 0]), "image/jpeg"),
  );
  const image = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await assert.rejects(() => processCarPhoto(image, "image/webp"));
});
test("photo references reject duplicate selections and external image URLs", () => {
  const p = {
    id: "acc9013b-9e49-4385-a6b5-f8d8118f87e4",
    src: "/api/car-images/acc9013b-9e49-4385-a6b5-f8d8118f87e4",
    width: 20,
    height: 20,
    description: "Car exterior",
  };
  assert.ok(carPhotosSchema.safeParse([p]).success);
  assert.ok(!carPhotosSchema.safeParse([p, p]).success);
  assert.ok(
    !carPhotosSchema.safeParse([{ ...p, src: "https://example.com/car.jpg" }])
      .success,
  );
});
