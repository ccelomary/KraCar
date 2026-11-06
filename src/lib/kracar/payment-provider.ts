import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
export const paymentEventSchema = z.object({
  id: z.uuid(),
  invoiceId: z.string().min(1).max(100),
  amount: z.number().int().positive().max(1000000000),
  reference: z.string().min(1).max(200),
  status: z.literal("succeeded"),
});
export type PaymentEvent = z.infer<typeof paymentEventSchema>;
export interface PaymentProvider {
  name: string;
  simulated: boolean;
  verify(body: string, signature: string): PaymentEvent;
}
export function demoSignature(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}
export function localPaymentProvider(secret: string): PaymentProvider {
  if (secret.length < 32)
    throw new Error("Configure a strong demo callback secret.");
  return {
    name: "KraCar local demo",
    simulated: true,
    verify(body, signature) {
      const expected = demoSignature(body, secret);
      if (
        !/^[a-f0-9]{64}$/.test(signature) ||
        !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
      )
        throw new Error("Invalid callback signature");
      return paymentEventSchema.parse(JSON.parse(body));
    },
  };
}
export const liveProviders = {
  payzone: {
    enabled: false,
    reason:
      "Provider credentials and confirmed callback documentation are required.",
  },
  cashplus: {
    enabled: false,
    reason:
      "Provider credentials and confirmed callback documentation are required.",
  },
  bankTransfer: {
    enabled: false,
    reason:
      "Bank payments may be recorded manually; automatic confirmation is not configured.",
  },
} as const;
