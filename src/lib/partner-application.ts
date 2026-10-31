import { z } from "zod";
import { cities } from "./catalog";
export const documentLimit = 5 * 1024 * 1024;
export const partnerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  owner: z.string().trim().min(2).max(100),
  email: z
    .email()
    .max(200)
    .transform((email) => email.toLowerCase()),
  phone: z
    .string()
    .trim()
    .regex(/^\+[\d\s()-]{8,24}$/),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+[\d\s()-]{8,24}$/),
  city: z.enum(cities),
  category: z.enum(["cars", "activities"]),
  registration: z.string().trim().min(2).max(80),
  fleetSize: z.coerce.number().int().min(1).max(10000),
  description: z.string().trim().min(20).max(2000),
  authority: z.literal("on"),
  consent: z.literal("on"),
});
export function documentType(bytes: Uint8Array): string | null {
  if (Buffer.from(bytes.subarray(0, 5)).toString() === "%PDF-")
    return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  )
    return "image/png";
  return null;
}
