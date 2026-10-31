import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
export const fuelLevels = [
  "empty",
  "quarter",
  "half",
  "three_quarters",
  "full",
] as const;
export const fuelLabels: Record<string, string> = {
  empty: "Empty",
  quarter: "Quarter tank",
  half: "Half tank",
  three_quarters: "Three-quarter tank",
  full: "Full tank",
};
const time = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.");
export const contractSchema = z
  .object({
    contactId: z.uuid(),
    vehicleId: z.uuid(),
    bookingId: text(100),
    invoiceId: text(100),
    driverName: text(120).min(2),
    driverLicence: text(80).min(2),
    start: z.iso.date(),
    end: z.iso.date(),
    pickupTime: time,
    returnTime: time,
    pickupLocation: text(300).min(3),
    returnLocation: text(300).min(3),
    currency: z.enum(["EUR", "MAD"]),
    dailyRate: z.number().int().min(1).max(100000000),
    deposit: z.number().int().min(0).max(100000000),
    mileageOut: z.number().int().min(0).max(5000000),
    fuelOut: z.enum(fuelLevels),
    conditionOut: text(3000).min(3),
    terms: text(10000).min(10),
    notes: text(2000),
  })
  .refine((v) => v.end > v.start, {
    message: "Return date must be after pickup.",
  });

export function contractQuote(start: string, end: string, dailyRate: number) {
  if (
    !z.iso.date().safeParse(start).success ||
    !z.iso.date().safeParse(end).success
  )
    throw new RangeError("Choose valid rental dates.");
  const days =
    (Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) /
    86400000;
  const total = days * dailyRate;
  if (
    !Number.isInteger(days) ||
    days < 1 ||
    days > 365 ||
    !Number.isSafeInteger(dailyRate) ||
    dailyRate < 1 ||
    !Number.isSafeInteger(total) ||
    total > 10000000000
  )
    throw new RangeError(
      "Choose a rental of 1 to 365 days with a valid daily rate.",
    );
  return { days, total };
}
export const returnSchema = z.object({
  date: z.iso.date(),
  mileage: z.number().int().min(0).max(5000000),
  fuel: z.enum(fuelLevels),
  condition: text(3000).min(3),
});
