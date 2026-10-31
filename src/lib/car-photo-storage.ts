import "server-only";
import type { Db } from "mongodb";
import type { CarPhoto } from "./car-photos";
export async function ownedCarPhotos(
  db: Db,
  agencyId: string,
  photos: CarPhoto[],
) {
  const assets = await db
    .collection("car_images")
    .find({
      id: { $in: photos.map((p) => p.id) },
      agencyId,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    })
    .project({ id: 1, width: 1, height: 1 })
    .toArray();
  if (assets.length !== photos.length)
    throw new RangeError("Choose photos uploaded to your agency.");
  await db
    .collection("car_images")
    .updateMany(
      { agencyId, id: { $in: photos.map((p) => p.id) } },
      { $unset: { expiresAt: "" } },
    );
  return photos.map((p) => {
    const asset = assets.find((a) => a.id === p.id)!;
    return {
      ...p,
      src: `/api/car-images/${asset.id}`,
      width: asset.width,
      height: asset.height,
    };
  });
}
