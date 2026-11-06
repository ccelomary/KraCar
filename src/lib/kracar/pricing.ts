export interface RateVehicle {
  dailyRate: number;
  deposit: number;
  weeklyDiscount: number;
  monthlyRate: number | null;
  extras: unknown;
  rules: {
    id: string;
    start: Date;
    end: Date;
    dailyRate: number;
    priority: number;
  }[];
}
export interface FeeConfig {
  demoTierFee: boolean;
  oneDayPrepayment: boolean;
  taxBps: number;
  policyVersion: string;
  marketplace?: boolean;
}
export const defaultFees: FeeConfig = {
  demoTierFee: false,
  oneDayPrepayment: false,
  taxBps: 0,
  policyVersion: "kracar-2026-11-02-10-5",
};
export interface RentalQuote {
  currency: "MAD";
  days: number;
  dailyRates: number[];
  subtotal: number;
  extras: number;
  discount: number;
  taxes: number;
  serviceFee: number;
  agencyCommission: number;
  total: number;
  partnerTotal: number;
  advance: number;
  prepayment: number;
  balance: number;
  deposit: number;
  policyVersion: string;
  selectedExtras: {
    id: string;
    name: string;
    quantity: number;
    total: number;
  }[];
}
export function tierFee(dailyMinor: number) {
  if (!Number.isSafeInteger(dailyMinor) || dailyMinor < 0)
    throw new RangeError("Invalid daily rate");
  const percentage = dailyMinor < 50000 ? 15 : dailyMinor < 100000 ? 10 : 8;
  // Three days of daily value, rounded upwards to a whole MAD; never a percent of the trip total.
  return Math.ceil((dailyMinor * 3 * percentage) / 10000) * 100;
}
export function rentalQuote(
  vehicle: RateVehicle,
  start: Date,
  end: Date,
  selected: Record<string, number> = {},
  fees = defaultFees,
): RentalQuote {
  if (
    !Number.isSafeInteger(fees.taxBps) ||
    fees.taxBps < 0 ||
    fees.taxBps > 3000
  )
    throw new RangeError("Invalid tax configuration");
  const duration = end.getTime() - start.getTime();
  if (!Number.isFinite(duration) || duration <= 0 || duration > 90 * 86400000)
    throw new RangeError("Choose a rental between one and ninety days.");
  const days = Math.ceil(duration / 86400000);
  const dailyRates = Array.from({ length: days }, (_, i) => {
    const instant = start.getTime() + i * 86400000;
    const rule = vehicle.rules
      .filter((r) => r.start.getTime() <= instant && r.end.getTime() > instant)
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0];
    return (
      rule?.dailyRate ??
      (days >= 30 && vehicle.monthlyRate !== null
        ? Math.round(vehicle.monthlyRate / 30)
        : vehicle.dailyRate)
    );
  });
  if (dailyRates.some((v) => !Number.isSafeInteger(v) || v < 0))
    throw new RangeError("Invalid rate configuration");
  const subtotal = dailyRates.reduce((a, b) => a + b, 0);
  const discount =
    days >= 7 && days < 30
      ? Math.round((subtotal * vehicle.weeklyDiscount) / 10000)
      : 0;
  const available = Array.isArray(vehicle.extras)
    ? (vehicle.extras as {
        id: string;
        name: string;
        price: number;
        perDay: boolean;
        max: number;
      }[])
    : [];
  const selectedExtras = Object.entries(selected).map(([id, quantity]) => {
    const extra = available.find((e) => e.id === id);
    if (
      !extra ||
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > extra.max
    )
      throw new RangeError("Check the selected extras.");
    return {
      id,
      name: extra.name,
      quantity,
      total: extra.price * quantity * (extra.perDay ? days : 1),
    };
  });
  const extras = selectedExtras.reduce((a, b) => a + b.total, 0);
  const partnerTotal = subtotal - discount + extras;
  const taxes = Math.round(
    (partnerTotal * fees.taxBps) / (10000 + fees.taxBps),
  );
  const marketplace = fees.marketplace !== false;
  const serviceFee = marketplace ? Math.round(partnerTotal * 0.05) : 0;
  const advance = marketplace ? Math.round(partnerTotal * 0.1) : 0;
  const total = partnerTotal + serviceFee;
  if (!Number.isSafeInteger(total) || total < 0 || total > 1000000000)
    throw new RangeError("Rental total exceeds the supported limit.");
  const prepayment = advance + serviceFee;
  return {
    currency: "MAD",
    days,
    dailyRates,
    subtotal,
    extras,
    discount,
    taxes,
    serviceFee,
    agencyCommission: 0,
    total,
    partnerTotal,
    advance,
    prepayment,
    balance: total - prepayment,
    deposit: vehicle.deposit,
    policyVersion: fees.policyVersion,
    selectedExtras,
  };
}
export const rentalTransitions: Record<string, string[]> = {
  requested: ["approved", "declined", "cancelled", "expired"],
  approved: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  declined: [],
  cancelled: [],
  expired: [],
};
export function canTransition(from: string, to: string) {
  return rentalTransitions[from]?.includes(to) ?? false;
}
export function periodsOverlap(a: Date, b: Date, c: Date, d: Date) {
  return a < d && c < b;
}
export function assertBalanced(lines: { account: string; amount: number }[]) {
  if (
    lines.length < 2 ||
    lines.some((l) => !Number.isSafeInteger(l.amount)) ||
    lines.reduce((a, l) => a + l.amount, 0) !== 0 ||
    new Set(lines.map((l) => l.account)).size !== lines.length
  )
    throw new RangeError("Unbalanced financial event");
}
