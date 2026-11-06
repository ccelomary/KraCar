import { z } from "zod";
import { carPhotosSchema } from "./car-photos";

const text = (max: number) => z.string().trim().max(max);
const date = z.union([z.iso.date(), z.literal("")]);
export const contactSchema = z.object({
  clientType: z.enum(["individual", "company"]).default("individual"),
  country: text(100).default(""),
  ICE: text(30).default(""),
  billingName: text(160).default(""),
  name: text(120).min(2),
  email: z.union([z.email().max(200), z.literal("")]),
  phone: text(40),
  company: text(160),
  address: text(500),
  notes: text(2000),
  status: z.enum(["active", "archived"]),
});
export const vehicleSchema = z.object({
  photos: carPhotosSchema.optional(),
  name: text(120).min(2),
  plate: text(30)
    .min(2)
    .transform((v) => v.toUpperCase().replace(/\s+/g, " ")),
  listingId: text(100),
  city: text(100).min(2),
  year: z
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 2),
  mileage: z.number().int().min(0).max(5000000),
  status: z.enum(["available", "rented", "maintenance", "inactive"]),
  insuranceDue: date,
  serviceDue: date,
  serviceMileage: z.number().int().min(0).max(5000000),
  notes: text(2000),
});
export const invoiceSchema = z
  .object({
    contactId: text(100).min(1),
    bookingId: text(100),
    issueDate: z.iso.date(),
    dueDate: z.iso.date(),
    currency: z.enum(["EUR", "MAD"]),
    notes: text(2000),
    items: z
      .array(
        z.object({
          description: text(300).min(1),
          quantity: z.number().int().min(1).max(10000),
          unitPrice: z.number().int().min(0).max(100000000),
        }),
      )
      .min(1)
      .max(30),
  })
  .refine((v) => v.dueDate >= v.issueDate, {
    message: "Due date must be on or after the invoice date.",
  });
export function invoiceTotal(items: { quantity: number; unitPrice: number }[]) {
  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  if (!Number.isSafeInteger(total) || total < 1 || total > 10000000000)
    throw new RangeError(
      "Invoice total must be greater than zero and within the supported limit.",
    );
  return total;
}
export function invoiceState(
  invoice: { status: string; dueDate: string; total: number; paid: number },
  date: string,
) {
  if (invoice.status !== "issued") return invoice.status;
  if (invoice.paid >= invoice.total) return "paid";
  return invoice.dueDate < date
    ? "overdue"
    : invoice.paid > 0
      ? "partially_paid"
      : "issued";
}
export function vehicleAttention(
  vehicle: {
    insuranceDue: string;
    serviceDue: string;
    serviceMileage: number;
    mileage: number;
  },
  date: string,
) {
  return [
    vehicle.insuranceDue && vehicle.insuranceDue <= date ? "Insurance due" : "",
    (vehicle.serviceDue && vehicle.serviceDue <= date) ||
    (vehicle.serviceMileage > 0 && vehicle.mileage >= vehicle.serviceMileage)
      ? "Service due"
      : "",
  ].filter(Boolean);
}
