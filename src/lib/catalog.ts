import type { Listing, Agency } from "./types";
import { localeTags, type Locale } from "@/i18n/core";
export const categories = [
  { id: "cars", label: "Car rentals", short: "Cars" },
  { id: "activities", label: "Things to do", short: "Activities" },
] as const;
export const cities = [
  "Marrakech",
  "Agadir",
  "Casablanca",
  "Tangier",
  "Essaouira",
  "Fes",
  "Khenifra",
];
export const seedAgencies: Agency[] = [
  {
    id: "agency-atlas",
    name: "Atlas Mobility",
    city: "Marrakech",
    email: "hello@atlas.example",
    status: "active",
    joined: "2026-06-12",
    commission: 12,
  },
  {
    id: "agency-coast",
    name: "Coast & Co.",
    city: "Agadir",
    email: "hello@coast.example",
    status: "active",
    joined: "2026-07-03",
    commission: 12,
  },
  {
    id: "agency-north",
    name: "Northern Horizons",
    city: "Tangier",
    email: "hello@north.example",
    status: "active",
    joined: "2026-10-18",
    commission: 12,
  },
  {
    id: "agency-rif",
    name: "Rif Adventures",
    city: "Fes",
    email: "hello@rif.example",
    status: "pending",
    joined: "2026-10-19",
    commission: 12,
  },
];
export const seedListings: Listing[] = [
  {
    id: "dacia-duster",
    agencyId: "agency-atlas",
    name: "Dacia Duster",
    category: "cars",
    city: "Marrakech",
    price: 4800,
    image: "/images/duster.jpg",
    description:
      "Room for a little more adventure. A comfortable SUV for city streets, coastal drives, and your own route through Morocco.",
    seats: 5,
    transmission: "Manual",
    fuel: "Diesel",
    badge: "Road trip ready",
    status: "published",
  },
  {
    id: "renault-clio",
    agencyId: "agency-atlas",
    name: "Renault Clio",
    category: "cars",
    city: "Marrakech",
    price: 3200,
    image: "/images/clio.jpg",
    description:
      "A nimble city companion with an easy drive, air conditioning, and space for your everyday essentials.",
    seats: 5,
    transmission: "Automatic",
    fuel: "Petrol",
    badge: "City favorite",
    status: "published",
  },
  {
    id: "volkswagen-tiguan",
    agencyId: "agency-coast",
    name: "Volkswagen Tiguan",
    category: "cars",
    city: "Agadir",
    price: 7200,
    image: "/images/tiguan.jpg",
    description:
      "A refined SUV with generous luggage room. Take the scenic route in a spacious, comfortable cabin.",
    seats: 5,
    transmission: "Automatic",
    fuel: "Diesel",
    badge: "Extra comfort",
    status: "published",
  },
  {
    id: "fiat-500",
    agencyId: "agency-coast",
    name: "Fiat 500",
    category: "cars",
    city: "Agadir",
    price: 2900,
    image: "/images/fiat.jpg",
    description:
      "Small car, wide-open possibilities. An easy-to-park choice for exploring at your own pace.",
    seats: 4,
    transmission: "Manual",
    fuel: "Petrol",
    badge: "Easy on the budget",
    status: "published",
  },
  {
    id: "taghazout-surf",
    agencyId: "agency-coast",
    name: "Catch your first wave",
    category: "activities",
    city: "Agadir",
    price: 4500,
    image: "/images/surf.jpg",
    description:
      "Two hours in the Atlantic with a local surf instructor. Board, wetsuit, and patient guidance included. Suitable for first-time surfers.",
    seats: 6,
    transmission: "2 hours",
    fuel: "Equipment included",
    badge: "Ocean state of mind",
    status: "published",
  },
  {
    id: "essaouira-escape",
    agencyId: "agency-atlas",
    name: "The Essaouira escape",
    category: "activities",
    city: "Essaouira",
    price: 6500,
    image: "/images/essaouira.jpg",
    description:
      "A private coastal day trip, with time for the medina, a harbor stroll, and a slower lunch by the sea. Pickup is coordinated after approval.",
    seats: 6,
    transmission: "Full day",
    fuel: "Private outing",
    badge: "Go a little further",
    status: "published",
  },
];
export function money(cents: number, locale: Locale = "en") {
  return new Intl.NumberFormat(localeTags[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
}
export function dateLabel(value: string, locale: Locale = "en") {
  return new Intl.DateTimeFormat(localeTags[locale], {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Casablanca",
  }).format(new Date(value));
}
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
