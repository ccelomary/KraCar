import type { Listing } from "./types";
export function yearsOnDate(birth: string, on: string) {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [oy, om, od] = on.split("-").map(Number);
  return oy - by - (om < bm || (om === bm && od < bd) ? 1 : 0);
}
export const plans = [
  {
    id: "essential",
    name: "Essential",
    price: 0,
    deposit: 90000,
    excess: 120000,
    age: 21,
    description: "Standard cover for a straightforward trip.",
  },
  {
    id: "comfort",
    name: "Comfort",
    price: 900,
    deposit: 50000,
    excess: 60000,
    age: 23,
    description: "A lower excess, with more room to relax.",
  },
  {
    id: "plus",
    name: "Plus",
    price: 1600,
    deposit: 20000,
    excess: 25000,
    age: 25,
    description: "Our lowest excess and security deposit.",
  },
  {
    id: "own",
    name: "My own cover",
    price: 0,
    deposit: 120000,
    excess: 150000,
    age: 25,
    description: "Use your own insurance. Check its rental exclusions.",
  },
];
export function quote(
  listing: Listing,
  start: string,
  end: string,
  protection = "essential",
  extras = 0,
  guests = 1,
) {
  const startMs = Date.parse(`${start}T00:00:00Z`),
    endMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs)
    throw new Error("Choose a valid date range.");
  const days =
    listing.category === "cars"
      ? Math.max(1, Math.ceil((endMs - startMs) / 86400000))
      : 1;
  if (days > 90)
    throw new Error("For trips over 90 days, please contact our team.");
  const plan = plans.find((p) => p.id === protection);
  if (!plan) throw new Error("Choose a protection option.");
  if (
    !Number.isInteger(extras) ||
    extras < 0 ||
    extras > 3 ||
    !Number.isInteger(guests) ||
    guests < 1 ||
    guests > listing.seats
  )
    throw new Error("Check the number of guests and extras.");
  const base =
    listing.price * days * (listing.category === "activities" ? guests : 1);
  const cover = listing.category === "cars" ? plan.price * days : 0;
  const addOns = listing.category === "cars" ? extras * 500 * days : 0;
  return {
    days,
    base,
    cover,
    addOns,
    total: base + cover + addOns,
    deposit: listing.category === "cars" ? plan.deposit : 0,
    excess: listing.category === "cars" ? plan.excess : 0,
  };
}
export const transitions: Record<string, string[]> = {
  requested: ["awaiting_payment", "declined", "cancelled"],
  awaiting_payment: ["cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  declined: [],
};
