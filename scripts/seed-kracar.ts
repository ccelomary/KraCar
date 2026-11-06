import { loadEnvConfig } from "@next/env";
import { coreDb } from "../src/lib/kracar/client";
import { rentalMongoUri } from "../src/lib/kracar/mongo-config";
import { hashPassword } from "better-auth/crypto";
loadEnvConfig(process.cwd());
if (process.env.NODE_ENV === "production" || process.env.DEMO_MODE !== "true")
  throw new Error("Demo seeding requires local DEMO_MODE=true.");
const connectionString = rentalMongoUri();
if (
  !connectionString ||
  !["127.0.0.1", "localhost"].includes(new URL(connectionString).hostname)
)
  throw new Error("Seed only an explicitly selected local MongoDB database.");
const db = coreDb();
async function seed() {
  const agencies = [
    { id: "kc-platform", name: "KraCar", city: "Casablanca" },
    { id: "agency-atlas", name: "KraCar Démo — Atlas Auto", city: "Marrakech" },
    { id: "kc-coast", name: "KraCar Démo — Côte Mobilité", city: "Agadir" },
  ];
  for (const a of agencies)
    await db.agency.upsert({
      where: { id: a.id },
      create: {
        ...a,
        status: "active",
        email: `${a.id}@kracar.example`,
        business: {
          legalName: a.name,
          address: `${a.city}, Maroc — démonstration`,
          ICE: "DEMO-NON-LEGAL",
          IF: "DEMO",
          RC: "DEMO",
          bank: "Démonstration uniquement",
        },
        terms: {
          fr: "Modèle de démonstration à faire valider par un professionnel. Le véhicule est restitué avec le même niveau de carburant. La caution est distincte du prix de location. Toute retenue doit être justifiée.",
          ar: "نموذج تجريبي يتطلب مراجعة مهنية. تعاد السيارة بمستوى الوقود نفسه. مبلغ الضمان مستقل عن ثمن الإيجار ويجب توثيق أي اقتطاع.",
        },
      },
      update: {},
    });
  const roles = [
    {
      id: "kc-admin",
      email: "admin@kracar.example",
      name: "Admin Démo",
      agencyId: "kc-platform",
      role: "platform",
    },
    {
      id: "kc-agency",
      email: "agence@kracar.example",
      name: "Agence Démo",
      agencyId: "agency-atlas",
      role: "admin",
    },
    {
      id: "kc-staff",
      email: "equipe@kracar.example",
      name: "Équipe Démo",
      agencyId: "agency-atlas",
      role: "staff",
    },
    {
      id: "kc-partner",
      email: "partenaire@kracar.example",
      name: "Partenaire Démo",
      agencyId: "kc-coast",
      role: "admin",
    },
    {
      id: "kc-customer",
      email: "client@kracar.example",
      name: "Client Démo",
      agencyId: null,
      role: "customer",
    },
  ];
  for (const r of roles) {
    await db.user.upsert({
      where: { id: r.id },
      create: { id: r.id, email: r.email, name: r.name, emailVerified: true },
      update: {},
    });
    await db.account.upsert({
      where: { id: `${r.id}-credential` },
      create: {
        id: `${r.id}-credential`,
        accountId: r.id,
        providerId: "credential",
        userId: r.id,
        password: await hashPassword("KraCarDemo2026!"),
      },
      update: {},
    });
    if (r.agencyId)
      await db.agencyMember.upsert({
        where: { agencyId_userId: { agencyId: r.agencyId, userId: r.id } },
        create: {
          agencyId: r.agencyId,
          userId: r.id,
          role: r.role,
          permissions: r.role === "staff" ? ["vehicles", "bookings"] : ["*"],
        },
        update: {},
      });
  }
  const cities = ["Casablanca", "Marrakech", "Rabat", "Tangier", "Agadir"];
  for (let i = 0; i < 10; i++) {
    const car = {
      id: `kc-car-${i + 1}`,
      agencyId: i < 7 ? "agency-atlas" : "kc-coast",
      name: [
        "Dacia Sandero",
        "Renault Clio",
        "Dacia Duster",
        "Volkswagen Tiguan",
        "Fiat 500",
      ][i % 5],
      plate: `DEMO-${i + 1}`,
      city: cities[i % 5],
      category: ["economy", "compact", "suv", "suv", "compact"][i % 5],
      transmission: i % 2 ? "automatic" : "manual",
      fuel: i % 3 ? "diesel" : "petrol",
      seats: 5,
      dailyRate: [28000, 35000, 55000, 85000, 30000][i % 5],
      deposit: 500000,
      weeklyDiscount: 500,
      monthlyRate: 750000,
      features: ["air_conditioning", "bluetooth", "usb"],
      images: [
        {
          src: `/images/${["clio", "clio", "duster", "tiguan", "fiat"][i % 5]}.jpg`,
          description: "Photo illustrative — véhicule de démonstration",
        },
      ],
      extras: [
        {
          id: "airport",
          name: "Livraison à l’aéroport",
          price: 15000,
          perDay: false,
          max: 1,
        },
        {
          id: "child-seat",
          name: "Siège enfant",
          price: 3000,
          perDay: true,
          max: 2,
        },
      ],
      conditions: {
        minimumAge: "21",
        licenceYears: "1",
        mileage: "200 km/jour",
        excessMileage: "1.50 MAD/km",
        fuel: "Même niveau au retour",
        insurance:
          "Assurance de démonstration; vérifier les garanties et la franchise avec l’agence",
        cancellation:
          "Demande d’annulation à examiner par l’agence; aucun remboursement automatique",
      },
      status: "published",
    };
    await db.vehicle.upsert({ where: { id: car.id }, create: car, update: {} });
  }
  await db.platformConfig.upsert({
    where: { id: "fees" },
    create: {
      id: "fees",
      value: {
        demoTierFee: false,
        oneDayPrepayment: true,
        taxBps: 0,
        policyVersion: "kracar-1",
      },
    },
    update: {},
  });
  console.log(
    "KraCar fictional local agencies, ten cars and five role accounts seeded. No email sent.",
  );
}
seed().finally(() => db.$disconnect());
