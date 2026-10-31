import { z } from "zod";
export const photoLimit = 5 * 1024 * 1024;
export const maxCarPhotos = 6;
export const photoMimeTypes = ["image/jpeg", "image/png", "image/webp"];
export const carPhotoSchema = z
  .object({
    id: z.uuid(),
    src: z.string().max(150),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    description: z.string().trim().max(160),
  })
  .refine((p) => p.src === `/api/car-images/${p.id}`, {
    message: "Choose photos uploaded to your agency.",
  });
export const carPhotosSchema = z
  .array(carPhotoSchema)
  .max(maxCarPhotos)
  .refine((p) => new Set(p.map((i) => i.id)).size === p.length, {
    message: "Each photo can only be selected once.",
  });
export type CarPhoto = z.infer<typeof carPhotoSchema>;
