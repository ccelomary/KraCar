import type { CarPhoto } from "./car-photos";
export type Category = "cars" | "drivers" | "boats" | "activities";
export type Role = "agency" | "platform";
export type Status =
  | "requested"
  | "awaiting_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "declined";
export interface Listing {
  id: string;
  agencyId: string;
  name: string;
  category: Category;
  city: string;
  price: number;
  image: string;
  photos?: CarPhoto[];
  description: string;
  seats: number;
  transmission: string;
  fuel: string;
  badge: string;
  status: "published" | "archived";
}
export interface Agency {
  billingAddress?: string;
  taxId?: string;
  owner?: string;
  phone?: string;
  whatsapp?: string;
  category?: Category;
  registration?: string;
  fleetSize?: number;
  description?: string;
  document?: { name: string; size: number; mime: string };
  id: string;
  name: string;
  city: string;
  email: string;
  status: "active" | "pending" | "suspended";
  joined: string;
  commission: number;
}
export interface Booking {
  id: string;
  agencyId: string;
  listingId: string;
  listingName: string;
  category: Category;
  city: string;
  name: string;
  email: string;
  phone: string;
  start: string;
  end: string;
  pickup: string;
  returnCity: string;
  guests: number;
  protection: string;
  extras: number;
  total: number;
  deposit: number;
  status: Status;
  createdAt: string;
  notes: string;
  tokenHash?: string;
  idempotencyKey?: string;
}
export interface Ticket {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "resolved";
  createdAt: string;
}
export interface Session {
  id: string;
  agencyId: string;
  name: string;
  email: string;
  role: Role;
  exp: number;
}
export interface DashboardData {
  bookings: Booking[];
  listings: Listing[];
  agencies: Agency[];
  tickets: Ticket[];
  session: Session;
  demo: boolean;
}

export interface Contact {
  id: string;
  agencyId: string;
  version: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  notes: string;
  status: "active" | "archived";
  createdAt: string;
}
export interface Vehicle {
  photos?: CarPhoto[];
  id: string;
  agencyId: string;
  version: number;
  name: string;
  plate: string;
  listingId: string;
  city: string;
  year: number;
  mileage: number;
  status: "available" | "rented" | "maintenance" | "inactive";
  insuranceDue: string;
  serviceDue: string;
  serviceMileage: number;
  notes: string;
  createdAt: string;
}
export interface Invoice {
  id: string;
  agencyId: string;
  version: number;
  number?: string;
  contactId: string;
  bookingId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    company: string;
    address: string;
  };
  issuer: {
    name: string;
    email: string;
    phone: string;
    registration: string;
    address: string;
    taxId?: string;
  };
  currency: "EUR" | "MAD";
  issueDate: string;
  dueDate: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  total: number;
  paid: number;
  status: "draft" | "issued" | "void";
  payments: { id: string; amount: number; date: string; reference: string }[];
  notes: string;
  createdAt: string;
}
export interface ManagementData {
  contacts: Contact[];
  vehicles: Vehicle[];
  invoices: Invoice[];
}

export interface RentalContract {
  id: string;
  agencyId: string;
  version: number;
  number?: string;
  status: "draft" | "issued" | "returned" | "void";
  contactId: string;
  vehicleId: string;
  bookingId: string;
  invoiceId: string;
  invoiceNumber: string;
  customer: Invoice["customer"];
  issuer: Invoice["issuer"];
  vehicle: { name: string; plate: string; year: number };
  driverName: string;
  driverLicence: string;
  start: string;
  end: string;
  pickupTime: string;
  returnTime: string;
  pickupLocation: string;
  returnLocation: string;
  currency: "EUR" | "MAD";
  dailyRate: number;
  days: number;
  total: number;
  deposit: number;
  mileageOut: number;
  fuelOut: string;
  conditionOut: string;
  terms: string;
  notes: string;
  returned?: { date: string; mileage: number; fuel: string; condition: string };
  createdAt: string;
}
