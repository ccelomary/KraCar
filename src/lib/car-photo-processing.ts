import sharp from "sharp";
import { photoLimit, photoMimeTypes } from "./car-photos";
export async function processCarPhoto(bytes: Buffer, mime: string) {
  if (
    !bytes.length ||
    bytes.length > photoLimit ||
    !photoMimeTypes.includes(mime)
  )
    throw new RangeError(
      "Choose a JPEG, PNG or WebP photo no larger than 5 MB.",
    );
  const magic = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? "image/png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? "image/jpeg"
      : bytes.subarray(0, 4).toString() === "RIFF" &&
          bytes.subarray(8, 12).toString() === "WEBP"
        ? "image/webp"
        : "";
  if (magic !== mime)
    throw new RangeError(
      "The photo could not be read. Choose a valid still JPEG, PNG or WebP image.",
    );
  try {
    const image = sharp(bytes, { limitInputPixels: 40000000, failOn: "error" });
    const metadata = await image.metadata();
    const mimeByFormat: Record<string, string> = {
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    const actualMime = mimeByFormat[metadata.format || ""];
    if (actualMime !== mime || (metadata.pages || 1) > 1)
      throw new Error("Invalid photo");
    const output = await image
      .rotate()
      .resize({
        width: 1600,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    return {
      bytes: output.data,
      width: output.info.width,
      height: output.info.height,
    };
  } catch {
    throw new RangeError(
      "The photo could not be read. Choose a valid still JPEG, PNG or WebP image.",
    );
  }
}
