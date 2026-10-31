import { MongoClient, type Db } from "mongodb";
import { randomBytes, scryptSync } from "node:crypto";
import { seedAgencies, seedListings } from "./catalog";
import type { Booking } from "./types";
const globalDb = globalThis as unknown as { atlasDb?: Promise<Db> };
export const demoMode = () =>
  process.env.DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export async function getDb() {
  if (!globalDb.atlasDb)
    globalDb.atlasDb = (async () => {
      if (!process.env.MONGODB_URI)
        throw new Error(
          "MongoDB is not configured. Set MONGODB_URI or run npm run dev.",
        );
      const client = await new MongoClient(process.env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      }).connect();
      const db = client.db(process.env.MONGODB_DB || "atlas_journeys");
      await Promise.all([
        db.collection("bookings").createIndex({ id: 1 }, { unique: true }),
        db.collection("bookings").createIndex({ agencyId: 1, start: 1 }),
        db
          .collection("bookings")
          .createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true }),
        db.collection("users").createIndex({ email: 1 }, { unique: true }),
        db.collection("users").createIndex({ id: 1 }, { unique: true }),
        db.collection("listings").createIndex({ id: 1 }, { unique: true }),
        db.collection("agencies").createIndex({ id: 1 }, { unique: true }),
        db
          .collection("agencies")
          .createIndex({ email: 1 }, { unique: true, sparse: true }),
        db
          .collection("partner_documents")
          .createIndex({ agencyId: 1 }, { unique: true }),
        db
          .collection("limits")
          .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      ]);
      if (demoMode()) await seedDatabase(db, true);
      return db;
    })().catch((error) => {
      globalDb.atlasDb = undefined;
      throw error;
    });
  return globalDb.atlasDb;
}
export async function seedDatabase(db: Db, demo = false) {
  if (demo) {
    await Promise.all(
      seedAgencies.map((a) =>
        db
          .collection("agencies")
          .updateOne({ id: a.id }, { $setOnInsert: a }, { upsert: true }),
      ),
    );
    await Promise.all(
      seedListings.map((a) =>
        db
          .collection("listings")
          .updateOne({ id: a.id }, { $setOnInsert: a }, { upsert: true }),
      ),
    );
  }
  const users = [
    {
      id: "user-platform",
      role: "platform",
      agencyId: "platform",
      name: "Sofia",
      email: process.env.ADMIN_EMAIL || (demo ? "admin@atlas.local" : ""),
      password: process.env.ADMIN_PASSWORD || (demo ? "AtlasDemo2026!" : ""),
    },
    {
      id: "user-agency",
      role: "agency",
      agencyId: process.env.AGENCY_ID || "agency-atlas",
      name: "Yasmine",
      email: process.env.AGENCY_EMAIL || (demo ? "agency@atlas.local" : ""),
      password: process.env.AGENCY_PASSWORD || (demo ? "AtlasDemo2026!" : ""),
    },
  ];
  for (const { password, ...user } of users)
    if (user.email && password)
      await db.collection("users").updateOne(
        { email: user.email.toLowerCase() },
        {
          $setOnInsert: {
            ...user,
            email: user.email.toLowerCase(),
            passwordHash: passwordHash(password),
          },
        },
        { upsert: true },
      );
  if (!demo) return;
  const names = [
    "Emma Laurent",
    "Oliver Bennett",
    "Amine Belkadi",
    "Sophie Martin",
    "Lucas Weber",
    "Nora Janssen",
    "Daniel Rossi",
    "Lina Haddad",
    "James Wilson",
    "Chloe Dubois",
    "Adam Clarke",
    "Sara Mansouri",
  ];
  for (let i = 0; i < 24; i++) {
    const l = seedListings[i % seedListings.length];
    const offset = i < 6 ? i : -(i - 4);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + offset);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 3 + (i % 4));
    const created = new Date(start);
    created.setUTCDate(created.getUTCDate() - 4);
    const booking: Booking = {
      id: `AJ-${2401 + i}`,
      agencyId: l.agencyId,
      listingId: l.id,
      listingName: l.name,
      category: l.category,
      city: l.city,
      name: names[i % names.length],
      email: `traveler${i + 1}@example.com`,
      phone: "+212 600 000 000",
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      pickup: `${l.city} airport`,
      returnCity: l.city,
      guests: 2,
      protection: "comfort",
      extras: 0,
      total: l.price * (l.category === "cars" ? 3 + (i % 4) : 1),
      deposit: l.category === "cars" ? 50000 : 0,
      status:
        i < 3
          ? "requested"
          : i < 6
            ? "confirmed"
            : i === 8
              ? "cancelled"
              : i < 12
                ? "awaiting_payment"
                : "completed",
      createdAt: created.toISOString(),
      notes: "Sample reservation for the local preview.",
    };
    await db
      .collection("bookings")
      .updateOne(
        { id: booking.id },
        { $setOnInsert: booking },
        { upsert: true },
      );
  }
  await db.collection("tickets").updateOne(
    { id: "ticket-demo" },
    {
      $setOnInsert: {
        id: "ticket-demo",
        name: "Emma Laurent",
        email: "traveler1@example.com",
        subject: "Pickup coordination",
        message:
          "Could we arrange pickup at the airport instead of the city center?",
        status: "open",
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );
}
