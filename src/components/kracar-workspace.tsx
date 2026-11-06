"use client";
import Dropdown from "./dropdown";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { createAuthClient } from "better-auth/react";
import { useTranslations } from "@/i18n/provider";
import { fetchJson } from "@/lib/client";
import { mad, rentalInstant, rentalLocal } from "@/lib/kracar/time";
import type { workspace } from "@/lib/kracar/service";
import type { RentalQuote } from "@/lib/kracar/pricing";
import { contractualFields } from "@/lib/kracar/terms";
import { Modal } from "./ui";
import RentalPhotoField from "./rental-photo-field";
import { WalletTools, VerificationTools } from "./kracar-finance-tools";
type Serialized<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
export type WorkspaceData = Serialized<Awaited<ReturnType<typeof workspace>>>;
type Field = {
  key: string;
  label: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
};
type Values = Record<string, string>;
type Operation = {
  title: string;
  fields: Field[];
  build: (v: Values) => Record<string, unknown>;
};
const customerFields: Field[] = [
  { key: "customerName", label: "Customer name", required: true },
  {
    key: "customerEmail",
    label: "Customer email",
    type: "email",
    required: true,
  },
  { key: "customerPhone", label: "Phone number", required: true },
  { key: "customerLicence", label: "Driving licence number" },
  { key: "customerAddress", label: "Address" },
];
const clauseDefault =
  "Modèle de démonstration à faire valider par un professionnel. Le véhicule est rendu au lieu et à l’heure convenus, avec le niveau de carburant indiqué. Le kilométrage autorisé, la franchise et les conditions d’annulation figurent au récapitulatif. Le dépôt de garantie est distinct du prix de location. Toute retenue exige un justificatif.";
const safeNext = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10) + "T10:00";
const asCustomer = (value: unknown) =>
  value as { name?: string; email?: string; phone?: string };
const qOf = (value: unknown) => value as RentalQuote;
export default function KraCarWorkspace({
  initial,
}: {
  initial?: WorkspaceData;
}) {
  const t = useTranslations(),
    router = useRouter(),
    path = usePathname(),
    params = useSearchParams(),
    { mutate: allCaches } = useSWRConfig();
  const { data, error, mutate, isLoading } = useSWR<WorkspaceData>(
    "/api/rental",
    fetchJson,
    { fallbackData: initial, revalidateOnFocus: true },
  );
  const [operation, setOperation] = useState<Operation | null>(null),
    [notice, setNotice] = useState(""),
    [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(params.get("q") || "");
  const { data: catalogue } = useSWR<{
    cars: { id: string; name: string; agencyId: string; city: string }[];
  }>("/api/rental-cars?max=10000000", fetchJson);
  if (error && !data)
    return (
      <section className="kc-auth">
        <h1>{t("Workspace unavailable")}</h1>
        <p role="alert">
          {t("Your workspace is temporarily unavailable. Please retry.")}
        </p>
        <button className="button" onClick={() => void mutate()}>
          {t("Try again")}
        </button>
        <Link href="/account">{t("Sign in")}</Link>
      </section>
    );
  if (!data)
    return (
      <section className="kc-auth">
        <p role="status">{t("Loading your workspace…")}</p>
      </section>
    );
  const actor = data.actor,
    isCustomer = actor.role === "customer",
    isPlatform = actor.role === "platform",
    requestedTab = params.get("tab") || "overview";
  const can = (permission: string) =>
    isPlatform ||
    (!isCustomer &&
      (actor.permissions.includes("*") ||
        actor.permissions.includes(permission)));
  const nav = [
    { id: "overview", label: "Overview", show: true },
    {
      id: "bookings",
      label: isCustomer ? "My rentals" : "Rental requests",
      show: isCustomer || can("bookings"),
    },
    { id: "calendar", label: "Fleet calendar", show: can("bookings") },
    { id: "vehicles", label: "Vehicles and rates", show: can("vehicles") },
    { id: "partners", label: "B2B fleet sharing", show: can("bookings") },
    {
      id: "contracts",
      label: "Contracts",
      show: isCustomer || can("contracts"),
    },
    {
      id: "documents",
      label: "Quotations and invoices",
      show: isCustomer || can("finance"),
    },
    {
      id: "payments",
      label: "Payments and deposits",
      show: isCustomer || can("finance"),
    },
    { id: "terms", label: "My contractual conditions", show: can("settings") },
    { id: "settings", label: "Agency and team", show: can("settings") },
    { id: "admin", label: "Platform administration", show: isPlatform },
  ].filter((n) => n.show);
  const tab = nav.some((n) => n.id === requestedTab)
    ? requestedTab
    : "overview";
  async function run(payload: Record<string, unknown>) {
    setBusy(true);
    setActionError("");
    try {
      const r = await fetch("/api/rental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error);
      await mutate();
      setNotice("Saved successfully.");
      setOperation(null);
      return v;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Please try again.");
      throw e;
    } finally {
      setBusy(false);
    }
  }
  const perform = (p: Record<string, unknown>) => void run(p).catch(() => {});
  function open(op: Operation) {
    setActionError("");
    setOperation(op);
  }
  const vehicleOptions = data.vehicles.map((v) => ({
    value: v.id,
    label: `${v.name} · ${v.plate} · ${v.city}`,
  }));
  const bookingOptions = data.bookings
    .filter((b) => b.agencyId === actor.agencyId || isPlatform)
    .map((b) => ({
      value: b.id,
      label: `${b.reference} · ${b.vehicle.name} · ${asCustomer(b.customer).name || ""}`,
    }));
  function newRental(source: "direct" | "b2b") {
    const options =
      source === "direct"
        ? vehicleOptions
        : (catalogue?.cars || [])
            .filter((c) => c.agencyId !== actor.agencyId)
            .map((c) => ({ value: c.id, label: `${c.name} · ${c.city}` }));
    open({
      title:
        source === "direct"
          ? "Record a direct rental"
          : "Request a partner vehicle",
      fields: [
        { key: "vehicleId", label: "Vehicle", required: true, options },
        ...customerFields,
        {
          key: "start",
          label: "Pickup date and time",
          type: "datetime-local",
          required: true,
          value: safeNext(1),
        },
        {
          key: "end",
          label: "Return date and time",
          type: "datetime-local",
          required: true,
          value: safeNext(4),
        },
        { key: "pickup", label: "Pickup location", required: true },
        { key: "dropoff", label: "Return location", required: true },
        ...(source === "direct"
          ? [
              {
                key: "recordedAmount",
                label: "Recorded rental amount in MAD",
                type: "number",
                min: 0,
              },
            ]
          : []),
      ],
      build: (v) => ({
        action: "booking.create",
        source,
        vehicleId: v.vehicleId,
        start: rentalInstant(v.start),
        end: rentalInstant(v.end),
        customer: {
          name: v.customerName,
          email: v.customerEmail,
          phone: v.customerPhone,
          licence: v.customerLicence,
          address: v.customerAddress,
        },
        pickup: v.pickup,
        dropoff: v.dropoff,
        idempotencyKey: crypto.randomUUID(),
        ...(v.recordedAmount
          ? { recordedAmount: Math.round(Number(v.recordedAmount) * 100) }
          : {}),
      }),
    });
  }
  function newBlock() {
    open({
      title: "Block vehicle dates",
      fields: [
        {
          key: "vehicleId",
          label: "Vehicle",
          required: true,
          options: vehicleOptions,
        },
        {
          key: "start",
          label: "Start",
          type: "datetime-local",
          required: true,
          value: safeNext(1),
        },
        {
          key: "end",
          label: "End",
          type: "datetime-local",
          required: true,
          value: safeNext(2),
        },
        {
          key: "reason",
          label: "Reason",
          required: true,
          options: [
            { value: "maintenance", label: "Maintenance" },
            { value: "personal", label: "Personal use" },
            { value: "other", label: "Other" },
          ],
        },
      ],
      build: (v) => ({
        action: "block.create",
        ...v,
        start: rentalInstant(v.start),
        end: rentalInstant(v.end),
      }),
    });
  }
  function vehicleEditor(id?: string) {
    const car = data!.vehicles.find((v) => v.id === id);
    const image = car?.images as
      { src: string; description: string }[] | undefined;
    const conditions = car?.conditions as Record<string, string> | undefined;
    open({
      title: id ? "Edit rental vehicle" : "Add rental vehicle",
      fields: [
        {
          key: "name",
          label: "Vehicle name",
          required: true,
          value: car?.name,
        },
        {
          key: "plate",
          label: "Registration plate",
          required: true,
          value: car?.plate,
        },
        {
          key: "city",
          label: "City",
          required: true,
          value: car?.city || "Casablanca",
        },
        {
          key: "category",
          label: "Vehicle category",
          options: ["economy", "compact", "suv", "premium", "van"].map((v) => ({
            value: v,
            label: v,
          })),
          value: car?.category,
        },
        {
          key: "transmission",
          label: "Transmission",
          options: ["manual", "automatic"].map((v) => ({ value: v, label: v })),
          value: car?.transmission,
        },
        {
          key: "fuel",
          label: "Fuel type",
          options: ["diesel", "petrol", "hybrid", "electric"].map((v) => ({
            value: v,
            label: v,
          })),
          value: car?.fuel,
        },
        {
          key: "seats",
          label: "Seats",
          type: "number",
          min: 2,
          max: 9,
          value: car?.seats || 5,
        },
        {
          key: "dailyRate",
          label: "Daily rate in MAD",
          type: "number",
          min: 1,
          required: true,
          value: (car?.dailyRate || 30000) / 100,
        },
        {
          key: "deposit",
          label: "Security deposit in MAD",
          type: "number",
          min: 0,
          value: (car?.deposit || 0) / 100,
        },
        {
          key: "weeklyDiscount",
          label: "Weekly discount percent",
          type: "number",
          min: 0,
          max: 50,
          value: (car?.weeklyDiscount || 0) / 100,
        },
        {
          key: "monthlyRate",
          label: "Monthly price in MAD",
          type: "number",
          min: 1,
          value: car?.monthlyRate ? car.monthlyRate / 100 : "",
        },
        {
          key: "features",
          label: "Features separated by commas",
          value: car?.features.join(", ") || "air_conditioning, bluetooth",
        },
        {
          key: "taxBps",
          label: "VAT included in price (%)",
          type: "number",
          min: 0,
          max: 30,
          value: Number(conditions?.taxBps || 0) / 100,
        },
        {
          key: "mileage",
          label: "Mileage allowance",
          value: conditions?.mileage || "200 km/jour",
        },
        {
          key: "excessMileage",
          label: "Excess mileage rate",
          value: conditions?.excessMileage || "1.50 MAD/km",
        },
        {
          key: "insurance",
          label: "Insurance and excess",
          type: "textarea",
          required: true,
          value: conditions?.insurance,
        },
        {
          key: "cancellation",
          label: "Cancellation conditions",
          type: "textarea",
          required: true,
          value: conditions?.cancellation,
        },
        {
          key: "fuelPolicy",
          label: "Fuel policy",
          value: conditions?.fuel || "Même niveau au retour",
        },
        {
          key: "status",
          label: "Visibility",
          options: ["draft", "published", "archived"].map((v) => ({
            value: v,
            label: v,
          })),
          value: car?.status || "draft",
        },
        {
          key: "images",
          label: "Car photos",
          type: "photos",
          value: JSON.stringify(image || []),
        },
      ],
      build: (v) => ({
        action: "vehicle.save",
        id,
        agencyId: actor.agencyId,
        name: v.name,
        plate: v.plate,
        city: v.city,
        category: v.category,
        transmission: v.transmission,
        fuel: v.fuel,
        seats: Number(v.seats),
        dailyRate: Math.round(Number(v.dailyRate) * 100),
        deposit: Math.round(Number(v.deposit) * 100),
        weeklyDiscount: Math.round(Number(v.weeklyDiscount) * 100),
        monthlyRate: v.monthlyRate
          ? Math.round(Number(v.monthlyRate) * 100)
          : null,
        features: v.features
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        conditions: {
          taxBps: String(Math.round(Number(v.taxBps) * 100)),
          mileage: v.mileage,
          excessMileage: v.excessMileage,
          insurance: v.insurance,
          cancellation: v.cancellation,
          fuel: v.fuelPolicy,
        },
        status: v.status,
        images: JSON.parse(v.images || "[]"),
        extras: car?.extras || [
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
      }),
    });
  }
  function prepareDocument(bookingId?: string) {
    open({
      title: "Prepare a document",
      fields: [
        {
          key: "bookingId",
          label: "Rental",
          required: true,
          options: bookingOptions,
          value: bookingId,
        },
        {
          key: "kind",
          label: "Document type",
          options: ["quotation", "proforma", "invoice"].map((v) => ({
            value: v,
            label: v,
          })),
        },
        {
          key: "dueAt",
          label: "Due date",
          type: "datetime-local",
          required: true,
          value: safeNext(7),
        },
      ],
      build: (v) => ({
        action: "document.prepare",
        ...v,
        dueAt: rentalInstant(v.dueAt),
      }),
    });
  }
  function prepareContract(bookingId?: string) {
    open({
      title: "Prepare a rental contract",
      fields: [
        {
          key: "bookingId",
          label: "Rental",
          options: bookingOptions,
          required: true,
          value: bookingId,
        },
        {
          key: "language",
          label: "Document language",
          options: [
            { value: "fr", label: "French" },
            { value: "ar", label: "Arabic" },
            { value: "en", label: "English" },
          ],
        },
        {
          key: "clauses",
          label: "Agency clauses — professional review required",
          type: "textarea",
          required: true,
          value:
            (data!.agencies[0]?.terms as Record<string, string>)?.fr ||
            clauseDefault,
        },
      ],
      build: (v) => ({ action: "contract.prepare", ...v }),
    });
  }
  const match = (...values: (string | undefined | null)[]) =>
    values.join(" ").toLowerCase().includes(search.toLowerCase());
  const bookings = data.bookings.filter((b) =>
    match(b.reference, b.vehicle.name, asCustomer(b.customer).name),
  );
  const invoices = data.documents.filter(
    (d) => d.kind === "invoice" && d.status !== "draft",
  );
  const outstanding = invoices.reduce(
      (a, d) => a + Math.max(0, d.total - d.credited - d.paid),
      0,
    ),
    collections = data.payments
      .filter((p) => p.recipient === "agency")
      .reduce((a, p) => a + p.amount - p.refunded, 0),
    rentalValue = data.bookings
      .filter((b) =>
        ["approved", "in_progress", "completed"].includes(b.status),
      )
      .reduce((a, b) => a + qOf(b.quote).total - qOf(b.quote).serviceFee, 0),
    held = data.deposits.reduce(
      (a, d) => a + d.received - d.retained - d.refunded,
      0,
    );
  const docLink = (id: string, kind = "document", language = "fr") =>
    `/api/rental-documents/${id}?kind=${kind}&language=${language}`;
  return (
    <div className="kc-workspace">
      <nav
        className="kc-work-nav"
        aria-label={t("Rental workspace navigation")}
      >
        <h2>KraCar</h2>
        {nav.map((n) => (
          <Link
            key={n.id}
            href={`${path}?tab=${n.id}`}
            aria-current={tab === n.id ? "page" : undefined}
          >
            {t(n.label)}
          </Link>
        ))}
        <button
          className="button secondary"
          onClick={async () => {
            await createAuthClient({
              basePath: "/api/customer-auth",
            }).signOut();
            await fetch("/api/auth", { method: "DELETE" });
            await allCaches(() => true, undefined, { revalidate: false });
            router.replace("/account");
            router.refresh();
          }}
        >
          {t("Sign out")}
        </button>
      </nav>
      <section className="kc-work-main" aria-busy={isLoading}>
        <div className="kc-work-toolbar">
          <div>
            <span className="eyebrow">
              {actor.name} · {t(actor.role)}
            </span>
            <h1>{t(nav.find((n) => n.id === tab)?.label || "Overview")}</h1>
          </div>
          <Link href="/cars" className="button secondary">
            {t("Find a car")}
          </Link>
        </div>
        {notice && (
          <p className="notice" role="status">
            {t(notice)}
          </p>
        )}
        {actionError && !operation && (
          <p className="error-note" role="alert">
            {t(actionError)}
          </p>
        )}
        {error && (
          <p className="error-note" role="alert">
            {t("Your workspace is temporarily unavailable. Please retry.")}
          </p>
        )}
        {tab === "overview" && isCustomer && (
          <div className="kc-customer-home">
            <div className="kc-customer-intro">
              <span className="eyebrow">{t("YOUR TRAVEL SPACE")}</span>
              <h2>{t("Your plans, and what comes next")}</h2>
              <p>
                {t(
                  "Follow your requests, check the partner’s reply and keep your documents together.",
                )}
              </p>
            </div>
            <div className="kc-customer-shortcuts">
              {[
                [
                  "bookings",
                  "Track my requests",
                  "See the status and next step for each rental.",
                ],
                [
                  "documents",
                  "Find my documents",
                  "View quotations, invoices and receipts.",
                ],
                [
                  "payments",
                  "Check my payments",
                  "Review recorded payments, balances and deposits.",
                ],
              ].map(([section, title, body]) => (
                <Link
                  className="card"
                  key={section}
                  href={`${path}?tab=${section}`}
                >
                  <h3>{t(title)} →</h3>
                  <p>{t(body)}</p>
                </Link>
              ))}
            </div>
            <article className="card kc-work-card">
              <h2>{t("Requests to follow")}</h2>
              {data.bookings.filter((b) =>
                ["requested", "approved", "in_progress"].includes(b.status),
              ).length ? (
                data.bookings
                  .filter((b) =>
                    ["requested", "approved", "in_progress"].includes(b.status),
                  )
                  .slice(0, 3)
                  .map((b) => (
                    <div className="kc-customer-request" key={b.id}>
                      <div>
                        <strong>{b.vehicle.name}</strong>
                        <p>
                          {b.reference} ·{" "}
                          {rentalLocal(b.start).replace("T", " ")}
                        </p>
                        <p>
                          {t(
                            b.status === "requested"
                              ? "Waiting for the partner’s reply"
                              : b.status === "approved"
                                ? "Partner approved — check the next steps"
                                : "Your rental is in progress",
                          )}
                        </p>
                      </div>
                      <Link
                        className="button secondary"
                        href={`${path}?tab=bookings&q=${encodeURIComponent(b.reference)}`}
                      >
                        {t("View request")}
                      </Link>
                    </div>
                  ))
              ) : (
                <div className="kc-customer-empty">
                  <h3>{t("Your next trip starts with an offer")}</h3>
                  <p>
                    {t(
                      "Choose your dates and a vehicle. You can review the price before sending a request.",
                    )}
                  </p>
                  <div className="row wrap">
                    <Link className="button" href="/cars">
                      {t("Rent a car")}
                    </Link>
                    <Link
                      className="button secondary"
                      href="/explore?category=activities"
                    >
                      {t("Find an activity")}
                    </Link>
                  </div>
                </div>
              )}
            </article>
          </div>
        )}
        {tab === "overview" && !isCustomer && (
          <>
            <div className="management-metrics">
              {[
                ["Accepted rental value", rentalValue],
                ["Rental collections", collections],
                ["Outstanding balance", outstanding],
                ["Security deposits held", held],
              ].map(([label, value]) => (
                <article className="card" key={label}>
                  <span>{t(String(label))}</span>
                  <strong>{mad(Number(value), t.tag)}</strong>
                </article>
              ))}
            </div>
            <p className="muted">
              {t(
                "Accepted rental value excludes deposits and KraCar fees. Collections use recorded payments less refunds. Balances use issued invoices less credits and payments.",
              )}
            </p>
            <div className="kc-work-cards">
              <article className="card kc-work-card">
                <h2>{t("Upcoming deliveries and returns")}</h2>
                {data.bookings
                  .filter((b) => ["approved", "in_progress"].includes(b.status))
                  .slice(0, 8)
                  .map((b) => (
                    <p key={b.id}>
                      <strong>{b.vehicle.name}</strong>
                      <br />
                      {new Intl.DateTimeFormat(t.tag, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Africa/Casablanca",
                      }).format(new Date(b.start))}{" "}
                      → {rentalLocal(b.end)}
                    </p>
                  ))}
                {!data.bookings.some((b) =>
                  ["approved", "in_progress"].includes(b.status),
                ) && <p>{t("No upcoming handovers yet.")}</p>}
              </article>
              <article className="card kc-work-card">
                <h2>{t("Notifications")}</h2>
                {data.notifications.length ? (
                  data.notifications.map((n) => (
                    <p key={n.id}>
                      {n.message}{" "}
                      {!n.readAt && (
                        <button
                          className="text-link"
                          onClick={() =>
                            perform({ action: "notification.read", id: n.id })
                          }
                        >
                          {t("Mark as read")}
                        </button>
                      )}
                    </p>
                  ))
                ) : (
                  <p>{t("You are up to date.")}</p>
                )}
              </article>
            </div>
          </>
        )}
        {["bookings", "partners"].includes(tab) && (
          <>
            <div className="kc-work-toolbar">
              <label>
                {t("Search rentals")}
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              {can("bookings") && (
                <div className="row">
                  <button
                    className="button"
                    onClick={() =>
                      newRental(tab === "partners" ? "b2b" : "direct")
                    }
                  >
                    {t(
                      tab === "partners"
                        ? "Request a partner vehicle"
                        : "Record a direct rental",
                    )}
                  </button>
                </div>
              )}
            </div>
            {tab === "partners" && (
              <p className="notice">
                {t(
                  "B2B: the supplying agency manages the contract, rental invoice and payment. The requesting agency coordinates its client. No additional commission is configured.",
                )}
              </p>
            )}
            <div className="kc-work-cards">
              {bookings
                .filter((b) => tab !== "partners" || b.source === "b2b")
                .map((b) => (
                  <article className="card kc-work-card" key={b.id}>
                    <span className="badge">
                      {t(b.source)} · {t(b.status)}
                    </span>
                    {b.source === "b2b" && (
                      <p className="eyebrow">
                        {t(
                          b.requestingAgencyId === actor.agencyId
                            ? "Sent request"
                            : "Received request",
                        )}
                      </p>
                    )}
                    <h2>{b.vehicle.name}</h2>
                    <p>
                      <strong>{b.reference}</strong> ·{" "}
                      {asCustomer(b.customer).name}
                    </p>
                    <p>
                      {rentalLocal(b.start)} → {rentalLocal(b.end)}
                    </p>
                    <p>
                      {mad(qOf(b.quote).total, t.tag)} · {t("Deposit")}:{" "}
                      {mad(qOf(b.quote).deposit, t.tag)}
                    </p>
                    {isCustomer && (
                      <div className="kc-booking-next-step">
                        <strong>{t("Next step")}</strong>
                        <p>
                          {t(
                            b.cancellation
                              ? "Your cancellation request is being reviewed. Contact support if you need an update."
                              : b.status === "requested"
                                ? "Wait for the partner’s reply. No payment is due for this pending request."
                                : b.status === "approved"
                                  ? "The partner has approved your request. Check your documents and contact support for the payment instructions. Approval alone is not payment confirmation."
                                  : b.status === "in_progress"
                                    ? "Keep your contract available and follow the agreed return instructions."
                                    : b.status === "completed"
                                      ? "Your rental is complete. Find your invoices and receipts in Documents."
                                      : "This request is closed. You can choose another vehicle or contact support.",
                          )}
                        </p>
                        <div className="row wrap">
                          <Link
                            className="text-link"
                            href={`${path}?tab=documents`}
                          >
                            {t("View documents")}
                          </Link>
                          <Link
                            className="text-link"
                            href={`/support?reference=${encodeURIComponent(b.reference)}`}
                          >
                            {t("Ask about this booking")}
                          </Link>
                        </div>
                      </div>
                    )}
                    {b.cancellation && (
                      <p className="notice">{t("Cancellation requested")}</p>
                    )}
                    <div className="row">
                      {can("bookings") &&
                        (b.agencyId === actor.agencyId || isPlatform) &&
                        (
                          {
                            requested: ["approved", "declined"],
                            approved: ["in_progress", "cancelled"],
                            in_progress: ["completed"],
                          } as Record<string, string[]>
                        )[b.status]?.map((status) => (
                          <button
                            className="button secondary"
                            key={status}
                            disabled={busy}
                            onClick={() =>
                              perform({
                                action: "booking.transition",
                                id: b.id,
                                status,
                                version: b.version,
                              })
                            }
                          >
                            {t(
                              (
                                {
                                  approved: "Approve request",
                                  declined: "Decline request",
                                  in_progress: "Start rental",
                                  completed: "Complete rental",
                                  cancelled: "Cancel rental",
                                } as Record<string, string>
                              )[status] || status,
                            )}
                          </button>
                        ))}
                      {isCustomer &&
                        ["requested", "approved"].includes(b.status) && (
                          <button
                            className="button secondary"
                            onClick={() =>
                              open({
                                title: "Request cancellation",
                                fields: [
                                  {
                                    key: "reason",
                                    label: "Reason",
                                    type: "textarea",
                                    required: true,
                                  },
                                ],
                                build: (v) => ({
                                  action: "booking.cancel-request",
                                  id: b.id,
                                  ...v,
                                }),
                              })
                            }
                          >
                            {t("Request cancellation")}
                          </button>
                        )}
                      {can("contracts") &&
                        ["approved", "in_progress", "completed"].includes(
                          b.status,
                        ) && (
                          <button
                            className="button ghost"
                            onClick={() => prepareContract(b.id)}
                          >
                            {t("Prepare contract")}
                          </button>
                        )}
                      {can("finance") && (
                        <button
                          className="button ghost"
                          onClick={() => prepareDocument(b.id)}
                        >
                          {t("Prepare invoice or quotation")}
                        </button>
                      )}
                      {can("contracts") &&
                        ["approved", "in_progress"].includes(b.status) && (
                          <button
                            className="button ghost"
                            onClick={() =>
                              open({
                                title: "Record condition report",
                                fields: [
                                  {
                                    key: "kind",
                                    label: "Handover",
                                    options: [
                                      { value: "pickup", label: "Pickup" },
                                      { value: "return", label: "Return" },
                                    ],
                                  },
                                  {
                                    key: "mileage",
                                    label: "Mileage",
                                    type: "number",
                                    min: 0,
                                    required: true,
                                  },
                                  {
                                    key: "fuel",
                                    label: "Fuel level",
                                    required: true,
                                  },
                                  {
                                    key: "equipment",
                                    label: "Equipment",
                                    required: true,
                                  },
                                  { key: "area", label: "Damage area" },
                                  {
                                    key: "damageNote",
                                    label: "Damage description",
                                  },
                                  {
                                    key: "notes",
                                    label: "Notes",
                                    type: "textarea",
                                  },
                                ],
                                build: (v) => ({
                                  action: "handover.save",
                                  bookingId: b.id,
                                  kind: v.kind,
                                  mileage: Number(v.mileage),
                                  fuel: v.fuel,
                                  equipment: v.equipment,
                                  damage: v.area
                                    ? [{ area: v.area, note: v.damageNote }]
                                    : [],
                                  notes: v.notes,
                                }),
                              })
                            }
                          >
                            {t("Condition report")}
                          </button>
                        )}
                      {isCustomer && b.status === "completed" && (
                        <button
                          className="button ghost"
                          onClick={() =>
                            open({
                              title: "Review your rental",
                              fields: [
                                {
                                  key: "rating",
                                  label: "Rating from 1 to 5",
                                  type: "number",
                                  min: 1,
                                  max: 5,
                                  value: 5,
                                  required: true,
                                },
                                {
                                  key: "comment",
                                  label: "Your review",
                                  type: "textarea",
                                  required: true,
                                },
                              ],
                              build: (v) => ({
                                action: "review.create",
                                bookingId: b.id,
                                rating: Number(v.rating),
                                comment: v.comment,
                              }),
                            })
                          }
                        >
                          {t("Leave a review")}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </div>
            {!bookings.length && (
              <div className="empty">
                <h2>
                  {t(
                    search
                      ? "No requests match your search"
                      : "No rental records yet.",
                  )}
                </h2>
                {search ? (
                  <button
                    className="button secondary"
                    onClick={() => setSearch("")}
                  >
                    {t("Clear search")}
                  </button>
                ) : (
                  <Link className="button" href="/cars">
                    {t("Find a car")}
                  </Link>
                )}
              </div>
            )}
          </>
        )}
        {tab === "vehicles" && (
          <>
            <div className="kc-work-toolbar">
              <p>
                {t(
                  "Manage physical vehicles, pricing and public availability.",
                )}
              </p>
              <button className="button" onClick={() => vehicleEditor()}>
                {t("Add rental vehicle")}
              </button>
            </div>
            <div className="kc-work-cards">
              {data.vehicles.map((v) => (
                <article className="card kc-work-card" key={v.id}>
                  {(v.images as { src: string }[])[0] && (
                    <Image
                      className="kc-mini-photo"
                      src={(v.images as { src: string }[])[0].src}
                      alt={v.name}
                      width={640}
                      height={400}
                      unoptimized
                    />
                  )}
                  <span className="badge">{t(v.status)}</span>
                  <h2>{v.name}</h2>
                  <p>
                    {v.plate} · {v.city}
                  </p>
                  <strong>
                    {mad(v.dailyRate, t.tag)} / {t("day")}
                  </strong>
                  <p>
                    {t("Weekly discount")}: {v.weeklyDiscount / 100}% ·{" "}
                    {t("Seasonal rules")}: {v.rules.length}
                  </p>
                  <div className="row">
                    <button
                      className="button secondary"
                      onClick={() => vehicleEditor(v.id)}
                    >
                      {t("Edit vehicle")}
                    </button>
                    <button
                      className="button ghost"
                      onClick={() =>
                        open({
                          title: "Add seasonal rate",
                          fields: [
                            {
                              key: "start",
                              label: "Start",
                              type: "datetime-local",
                              required: true,
                              value: safeNext(1),
                            },
                            {
                              key: "end",
                              label: "End",
                              type: "datetime-local",
                              required: true,
                              value: safeNext(7),
                            },
                            {
                              key: "dailyRate",
                              label: "Daily rate in MAD",
                              type: "number",
                              min: 1,
                              required: true,
                            },
                            {
                              key: "priority",
                              label: "Priority",
                              type: "number",
                              min: 0,
                              max: 100,
                              value: 1,
                            },
                          ],
                          build: (f) => ({
                            action: "pricing.rule",
                            vehicleId: v.id,
                            start: rentalInstant(f.start),
                            end: rentalInstant(f.end),
                            dailyRate: Math.round(Number(f.dailyRate) * 100),
                            priority: Number(f.priority),
                          }),
                        })
                      }
                    >
                      {t("Seasonal rate")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {tab === "calendar" && (
          <>
            <div className="kc-work-toolbar">
              <label>
                {t("Filter vehicle or reason")}
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="row">
                <button className="button" onClick={() => newRental("direct")}>
                  {t("Record a direct rental")}
                </button>
                <button className="button secondary" onClick={newBlock}>
                  {t("Block dates")}
                </button>
              </div>
            </div>
            <p className="notice">
              {t(
                "Approved rentals and manual blocks reserve the same physical inventory. Requested rentals do not reserve dates.",
              )}
            </p>
            <div className="kc-work-cards">
              {data.blocks
                .filter((b) =>
                  match(
                    data.vehicles.find((v) => v.id === b.vehicleId)?.name,
                    b.reason,
                  ),
                )
                .map((b) => (
                  <article className="card kc-work-card" key={b.id}>
                    <span className="badge">{t(b.reason)}</span>
                    <h2>
                      {data.vehicles.find((v) => v.id === b.vehicleId)?.name ||
                        b.vehicleId}
                    </h2>
                    <p>
                      {rentalLocal(b.start)} → {rentalLocal(b.end)}
                    </p>
                    {!b.bookingId && (
                      <button
                        className="button secondary"
                        onClick={() =>
                          perform({ action: "block.delete", id: b.id })
                        }
                      >
                        {t("Release block")}
                      </button>
                    )}
                  </article>
                ))}
            </div>
            {!data.blocks.length && (
              <p className="empty">
                {t("No reserved intervals. Record a rental or add a block.")}
              </p>
            )}
          </>
        )}
        {tab === "contracts" && (
          <>
            <div className="kc-work-toolbar">
              <p>
                {t(
                  "Signed versions remain immutable. Amendments create a new version.",
                )}
              </p>
              {can("contracts") && (
                <button className="button" onClick={() => prepareContract()}>
                  {t("Prepare contract")}
                </button>
              )}
            </div>
            <div className="kc-work-cards">
              {data.contracts.map((c) => (
                <article key={c.id} className="card kc-work-card">
                  <span className="badge">{t(c.status)}</span>
                  <h2>{c.number}</h2>
                  <p>
                    {t("Version")} {c.currentVersion}
                  </p>
                  {c.versions.map((v) => (
                    <div key={v.id}>
                      <p>
                        {t("Version")} {v.version} · {v.signatures.length}/2{" "}
                        {t("signatures")}
                      </p>
                      <div className="row">
                        <a
                          className="button secondary"
                          href={docLink(v.id, "contract", v.language)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("Preview")}
                        </a>
                        <a
                          className="button ghost"
                          href={
                            docLink(v.id, "contract", v.language) +
                            "&format=pdf"
                          }
                        >
                          {t("Download PDF")}
                        </a>
                        {v.version === c.currentVersion &&
                          !v.signatures.some(
                            (s) =>
                              s.party === (isCustomer ? "customer" : "agency"),
                          ) && (
                            <button
                              className="button"
                              onClick={() =>
                                open({
                                  title: "Sign this contract version",
                                  fields: [
                                    {
                                      key: "signer",
                                      label: "Your full legal name",
                                      required: true,
                                      value: actor.name,
                                    },
                                    {
                                      key: "evidence",
                                      label:
                                        "Type your signature acknowledgment",
                                      type: "textarea",
                                      required: true,
                                    },
                                    {
                                      key: "consent",
                                      label:
                                        "I agree to this exact contract version. This captured acknowledgment is not a qualified electronic signature.",
                                      type: "checkbox",
                                      required: true,
                                    },
                                  ],
                                  build: (f) => ({
                                    action: "contract.sign",
                                    versionId: v.id,
                                    party: isCustomer ? "customer" : "agency",
                                    signer: f.signer,
                                    evidence: f.evidence,
                                    consent: f.consent === "on",
                                  }),
                                })
                              }
                            >
                              {t("Sign version")}
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                  {can("contracts") && (
                    <button
                      className="text-link"
                      onClick={() => prepareContract(c.bookingId)}
                    >
                      {t("Create amendment")}
                    </button>
                  )}
                </article>
              ))}
            </div>
            {!data.contracts.length && (
              <p className="empty">{t("No rental contracts yet.")}</p>
            )}
          </>
        )}
        {tab === "documents" && (
          <>
            <div className="kc-work-toolbar">
              <label>
                {t("Search documents")}
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              {can("finance") && (
                <button className="button" onClick={() => prepareDocument()}>
                  {t("Prepare a document")}
                </button>
              )}
            </div>
            <div className="kc-work-cards">
              {data.documents
                .filter((d) => match(d.number, d.kind))
                .map((d) => {
                  const balance = Math.max(0, d.total - d.credited - d.paid);
                  return (
                    <article key={d.id} className="card kc-work-card">
                      <span className="badge">
                        {t(d.kind)} ·{" "}
                        {t(
                          d.status === "issued" && d.kind === "invoice"
                            ? d.credited === d.total
                              ? "credited"
                              : balance === 0
                                ? "paid"
                                : d.paid > 0
                                  ? "partially_paid"
                                  : new Date(d.dueAt) < new Date()
                                    ? "overdue"
                                    : "issued"
                            : d.status,
                        )}
                      </span>
                      <h2>{d.number || t("Draft document")}</h2>
                      <p>
                        {t("Invoicing party")}:{" "}
                        {d.issuer === "platform"
                          ? "KraCar"
                          : data.agencies.find((a) => a.id === d.agencyId)
                              ?.name || t("Rental agency")}
                      </p>
                      <p>
                        {mad(d.total, t.tag)} · {t("Balance")}:{" "}
                        {mad(balance, t.tag)}
                      </p>
                      <div className="row">
                        <a
                          className="button secondary"
                          href={docLink(d.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("Preview")}
                        </a>
                        <a
                          className="button ghost"
                          href={docLink(d.id) + "&format=pdf"}
                        >
                          {t("Download PDF")}
                        </a>
                        <a
                          className="button ghost"
                          href={docLink(d.id, "document", "ar") + "&format=pdf"}
                        >
                          {t("Arabic PDF")}
                        </a>
                        {can("finance") &&
                          d.status === "draft" &&
                          d.kind !== "proforma" && (
                            <button
                              className="button"
                              onClick={() =>
                                perform({ action: "document.issue", id: d.id })
                              }
                            >
                              {t("Issue document")}
                            </button>
                          )}
                        {can("finance") &&
                          d.status !== "draft" &&
                          d.kind === "invoice" && (
                            <button
                              className="button ghost"
                              onClick={() =>
                                open({
                                  title: "Issue a credit note",
                                  fields: [
                                    {
                                      key: "amount",
                                      label: "Credit amount in MAD",
                                      type: "number",
                                      min: 0.01,
                                      required: true,
                                    },
                                    {
                                      key: "reason",
                                      label: "Reason",
                                      type: "textarea",
                                      required: true,
                                    },
                                  ],
                                  build: (v) => ({
                                    action: "credit.issue",
                                    invoiceId: d.id,
                                    amount: Math.round(Number(v.amount) * 100),
                                    reason: v.reason,
                                  }),
                                })
                              }
                            >
                              {t("Credit note")}
                            </button>
                          )}
                        {isCustomer &&
                          d.kind === "quotation" &&
                          d.status === "issued" && (
                            <button
                              className="button"
                              onClick={() =>
                                perform({
                                  action: "quotation.accept",
                                  id: d.id,
                                })
                              }
                            >
                              {t("Accept quotation")}
                            </button>
                          )}
                        {d.kind === "invoice" &&
                          d.status !== "draft" &&
                          balance > 0 && (
                            <button
                              className="button"
                              onClick={() =>
                                open({
                                  title: isCustomer
                                    ? "Simulate a payment"
                                    : "Record received payment",
                                  fields: [
                                    {
                                      key: "amount",
                                      label: "Amount in MAD",
                                      type: "number",
                                      min: 0.01,
                                      max: balance / 100,
                                      required: true,
                                      value: balance / 100,
                                    },
                                    {
                                      key: "method",
                                      label: "Payment method",
                                      options: [
                                        "cash",
                                        "bank",
                                        "cashplus",
                                        "card",
                                        "wallet",
                                      ].map((v) => ({ value: v, label: v })),
                                    },
                                    {
                                      key: "reference",
                                      label: isCustomer
                                        ? "Simulation reference"
                                        : "Payment reference",
                                      required: true,
                                      value: isCustomer
                                        ? "DEMO — no real money"
                                        : "",
                                    },
                                  ],
                                  build: (v) => ({
                                    action: isCustomer
                                      ? "payment.demo"
                                      : "payment.record",
                                    invoiceId: d.id,
                                    amount: Math.round(Number(v.amount) * 100),
                                    method: v.method,
                                    reference: v.reference,
                                    eventKey: crypto.randomUUID(),
                                  }),
                                })
                              }
                            >
                              {t(
                                isCustomer
                                  ? "Demo payment — no real charge"
                                  : "Record payment",
                              )}
                            </button>
                          )}
                      </div>
                    </article>
                  );
                })}
            </div>
            {!data.documents.length && (
              <p className="empty">
                {t(
                  "No documents yet. Your agency will prepare them for your rental.",
                )}
              </p>
            )}
          </>
        )}
        {tab === "payments" && (
          <>
            <div className="kc-work-toolbar">
              <h2>{t("Payment records")}</h2>
              {!isCustomer && (
                <a
                  className="button secondary"
                  href="/api/rental-export"
                  download
                >
                  {t("Export transactions CSV")}
                </a>
              )}
            </div>
            <p className="notice">
              {t(
                "Recording a payment or refund does not move money. Simulated payments are clearly marked. Refundable deposits are tracked separately.",
              )}
            </p>
            <div className="kc-work-cards">
              {data.payments.map((p) => (
                <article key={p.id} className="card kc-work-card">
                  <span className="badge">{t(p.verification)}</span>
                  <h2>{mad(p.amount, t.tag)}</h2>
                  <p>
                    {t(p.method)} · {p.reference}
                  </p>
                  <p>
                    {t("Refunded")}: {mad(p.refunded, t.tag)}
                  </p>
                  <button
                    className="button secondary"
                    onClick={() =>
                      open({
                        title: "Request a refund",
                        fields: [
                          {
                            key: "amount",
                            label: "Refund amount in MAD",
                            type: "number",
                            min: 0.01,
                            max: (p.amount - p.refunded) / 100,
                            required: true,
                          },
                          {
                            key: "reason",
                            label: "Reason",
                            type: "textarea",
                            required: true,
                          },
                        ],
                        build: (v) => ({
                          action: "refund.request",
                          paymentId: p.id,
                          amount: Math.round(Number(v.amount) * 100),
                          reason: v.reason,
                          eventKey: crypto.randomUUID(),
                        }),
                      })
                    }
                  >
                    {t("Request refund")}
                  </button>
                </article>
              ))}
              {data.refunds.map((r) => (
                <article key={r.id} className="card kc-work-card">
                  <span className="badge">
                    {t("Refund")} · {t(r.status)}
                  </span>
                  <h2>{mad(r.amount, t.tag)}</h2>
                  <p>{r.reason}</p>
                  {can("finance") && r.status === "requested" && (
                    <button
                      className="button secondary"
                      onClick={() =>
                        open({
                          title: "Record approved refund",
                          fields: [
                            {
                              key: "reference",
                              label: "Refund transaction reference",
                              required: true,
                            },
                          ],
                          build: (v) => ({
                            action: "refund.approve",
                            id: r.id,
                            ...v,
                          }),
                        })
                      }
                    >
                      {t("Approve and record refund")}
                    </button>
                  )}
                </article>
              ))}
            </div>
            <h2 style={{ marginTop: "2rem" }}>{t("Security deposits")}</h2>
            <div className="kc-work-cards">
              {data.deposits.map((d) => (
                <article key={d.id} className="card kc-work-card">
                  <span className="badge">{t(d.status)}</span>
                  <h3>
                    {data.bookings.find((b) => b.id === d.bookingId)?.reference}
                  </h3>
                  <p>
                    {t("Required")}: {mad(d.required, t.tag)}
                    <br />
                    {t("Received")}: {mad(d.received, t.tag)}
                    <br />
                    {t("Retained")}: {mad(d.retained, t.tag)}
                    <br />
                    {t("Refunded")}: {mad(d.refunded, t.tag)}
                  </p>
                  {can("finance") && (
                    <button
                      className="button secondary"
                      onClick={() =>
                        open({
                          title: "Update security deposit",
                          fields: [
                            {
                              key: "operation",
                              label: "Operation",
                              options: [
                                "receive",
                                "retain",
                                "refund",
                                "release",
                              ].map((v) => ({ value: v, label: v })),
                            },
                            {
                              key: "amount",
                              label: "Amount in MAD",
                              type: "number",
                              min: 0,
                              required: true,
                            },
                            {
                              key: "reason",
                              label: "Reason and supporting evidence",
                              type: "textarea",
                              required: true,
                            },
                          ],
                          build: (v) => ({
                            action: "deposit.update",
                            bookingId: d.bookingId,
                            operation: v.operation,
                            amount: Math.round(Number(v.amount) * 100),
                            reason: v.reason,
                          }),
                        })
                      }
                    >
                      {t("Update deposit")}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
        {tab === "terms" && (
          <div className="stack">
            <div>
              <span className="eyebrow">{t("PARTNER WORKSPACE")}</span>
              <h2>{t("My contractual conditions")}</h2>
              <p>
                {t(
                  "Set your general conditions and the specifics of each offer. Submit changes for review. Previously accepted bookings retain their original conditions.",
                )}
              </p>
            </div>
            {data.agencies.map((a) => (
              <article className="card kc-work-card" key={a.id}>
                <div className="row between wrap">
                  <h3>{a.name}</h3>
                  <span className="badge">
                    {t(
                      (a.terms as Record<string, string>)._status ||
                        "Not submitted",
                    )}
                  </span>
                </div>
                <div className="kc-terms-grid">
                  {contractualFields.map(([key, label]) => (
                    <div key={key}>
                      <h3>{t(label)}</h3>
                      <p>
                        {(a.terms as Record<string, string>)[key] ||
                          t("To complete")}
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  className="button"
                  style={{ marginTop: 20 }}
                  onClick={() =>
                    open({
                      title: "My contractual conditions",
                      fields: [
                        ...contractualFields.map(([key, label]) => ({
                          key,
                          label,
                          type: "textarea",
                          value: (a.terms as Record<string, string>)[key] || "",
                        })),
                        {
                          key: "fr",
                          label: "French contract clauses",
                          type: "textarea",
                          value: (a.terms as Record<string, string>).fr || "",
                        },
                        {
                          key: "ar",
                          label: "Arabic contract clauses",
                          type: "textarea",
                          value: (a.terms as Record<string, string>).ar || "",
                        },
                      ],
                      build: (v) => ({
                        action: "agency.profile",
                        id: a.id,
                        name: a.name,
                        city: a.city,
                        email: a.email,
                        business: a.business,
                        terms: { ...(a.terms as Record<string, string>), ...v },
                      }),
                    })
                  }
                >
                  {t("Edit and submit for review")}
                </button>
                {isPlatform && (
                  <div className="row" style={{ marginTop: 16 }}>
                    <button
                      className="button secondary"
                      onClick={() =>
                        perform({
                          action: "terms.review",
                          id: a.id,
                          approved: true,
                        })
                      }
                    >
                      {t("Approve conditions")}
                    </button>
                    <button
                      className="button secondary"
                      onClick={() =>
                        perform({
                          action: "terms.review",
                          id: a.id,
                          approved: false,
                        })
                      }
                    >
                      {t("Return for correction")}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        {tab === "settings" && (
          <div className="kc-work-cards">
            {data.agencies.map((a) => (
              <article key={a.id} className="card kc-work-card">
                <span className="badge">{t(a.status)}</span>
                <h2>{a.name}</h2>
                <p>
                  {a.city} · {a.email}
                </p>
                <p>
                  {t(
                    "Agency verification is required before publishing cars or accepting rentals.",
                  )}
                </p>
                <button
                  className="button secondary"
                  onClick={() =>
                    open({
                      title: "Edit business profile",
                      fields: [
                        {
                          key: "name",
                          label: "Agency name",
                          value: a.name,
                          required: true,
                        },
                        {
                          key: "city",
                          label: "City",
                          value: a.city,
                          required: true,
                        },
                        {
                          key: "email",
                          label: "Business email",
                          type: "email",
                          value: a.email,
                          required: true,
                        },
                        ...(
                          [
                            "legalName",
                            "address",
                            "ICE",
                            "IF",
                            "RC",
                            "TP",
                            "taxRegime",
                            "legalForm",
                            "capital",
                            "bank",
                          ] as const
                        ).map((key) => ({
                          key,
                          label: key,
                          value:
                            (a.business as Record<string, string>)[key] || "",
                          required: key !== "bank",
                        })),
                        {
                          key: "fr",
                          label: "French contract clauses",
                          type: "textarea",
                          value:
                            (a.terms as Record<string, string>).fr ||
                            clauseDefault,
                        },
                        {
                          key: "ar",
                          label: "Arabic contract clauses",
                          type: "textarea",
                          value: (a.terms as Record<string, string>).ar || "",
                        },
                      ],
                      build: (v) => ({
                        action: "agency.profile",
                        id: a.id,
                        name: v.name,
                        city: v.city,
                        email: v.email,
                        business: {
                          legalName: v.legalName,
                          address: v.address,
                          ICE: v.ICE,
                          IF: v.IF,
                          RC: v.RC,
                          bank: v.bank,
                        },
                        terms: {
                          ...(a.terms as Record<string, string>),
                          fr: v.fr,
                          ar: v.ar,
                        },
                      }),
                    })
                  }
                >
                  {t("Edit business profile")}
                </button>
              </article>
            ))}
            <article className="card kc-work-card">
              <h2>{t("Staff permissions")}</h2>
              <p>
                {t(
                  "Team members must first create a KraCar account. Grant only the permissions they need.",
                )}
              </p>
              <button
                className="button"
                onClick={() =>
                  open({
                    title: "Add or update team member",
                    fields: [
                      {
                        key: "email",
                        label: "Account email",
                        type: "email",
                        required: true,
                      },
                      ...[
                        "vehicles",
                        "bookings",
                        "contracts",
                        "finance",
                        "settings",
                      ].map((key) => ({ key, label: key, type: "checkbox" })),
                    ],
                    build: (v) => ({
                      action: "member.save",
                      email: v.email,
                      permissions: [
                        "vehicles",
                        "bookings",
                        "contracts",
                        "finance",
                        "settings",
                      ].filter((k) => v[k] === "on"),
                    }),
                  })
                }
              >
                {t("Manage team member")}
              </button>
              {data.members.map((m) => (
                <p key={m.id}>
                  {m.userId} · {m.permissions.join(", ")}
                </p>
              ))}
            </article>
          </div>
        )}
        {tab === "admin" && isPlatform && (
          <>
            <div className="kc-work-toolbar">
              <h2>{t("Agency verification")}</h2>
              <button
                className="button secondary"
                onClick={() =>
                  open({
                    title: "Configure fees",
                    fields: [
                      {
                        key: "policyVersion",
                        label: "Policy version",
                        required: true,
                        value: `kracar-${Date.now()}`,
                      },
                    ],
                    build: (v) => ({
                      action: "fees.save",
                      demoTierFee: false,
                      oneDayPrepayment: false,
                      taxBps: 0,
                      policyVersion: v.policyVersion,
                    }),
                  })
                }
              >
                {t("Fee configuration")}
              </button>
            </div>
            <p className="notice">
              {t(
                "Marketplace bookings use a 10% service advance plus a 5% platform fee on the partner TTC price, including options and discounts. The remaining 90% is due to the partner. Deposits are separate. Existing quotes keep their recorded policy.",
              )}
            </p>
            <button
              className="button secondary"
              style={{ marginBottom: 20 }}
              onClick={() =>
                open({
                  title: "Platform invoice issuer",
                  fields: [
                    "legalName",
                    "address",
                    "ICE",
                    "IF",
                    "TP",
                    "taxRegime",
                    "RC",
                    "legalForm",
                    "capital",
                  ].map((key) => ({
                    key,
                    label: key,
                    required: [
                      "legalName",
                      "address",
                      "ICE",
                      "IF",
                      "TP",
                      "taxRegime",
                    ].includes(key),
                  })),
                  build: (v) => ({ action: "billing.save", business: v }),
                })
              }
            >
              {t("Platform invoice issuer")}
            </button>
            <div className="kc-work-cards">
              {data.agencies
                .filter((a) => a.id !== "kc-platform")
                .map((a) => (
                  <article className="card kc-work-card" key={a.id}>
                    <span className="badge">{t(a.status)}</span>
                    <h2>{a.name}</h2>
                    <p>
                      {a.city} · {a.email}
                    </p>
                    <p>
                      {Object.entries(a.business as Record<string, string>)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                    <div className="row">
                      {["active", "rejected", "suspended"].map((status) => (
                        <button
                          className="button secondary"
                          key={status}
                          onClick={() =>
                            open({
                              title: "Update agency verification",
                              fields: [
                                {
                                  key: "reason",
                                  label: "Decision reason",
                                  type: "textarea",
                                  required: true,
                                },
                              ],
                              build: (v) => ({
                                action: "agency.verify",
                                id: a.id,
                                status,
                                reason: v.reason,
                              }),
                            })
                          }
                        >
                          {t(status)}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
            </div>
            <h2 style={{ marginTop: "2rem" }}>{t("Audit history")}</h2>
            <div className="kc-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("Date")}</th>
                    <th>{t("User")}</th>
                    <th>{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.auditEvents.map((a) => (
                    <tr key={a.id}>
                      <td>{rentalLocal(a.createdAt)}</td>
                      <td>{a.actorId}</td>
                      <td>{a.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === "payments" && can("finance") && (
          <WalletTools data={data} onSave={run} />
        )}
        {["settings", "admin"].includes(tab) && can("settings") && (
          <VerificationTools data={data} reload={mutate} onSave={run} />
        )}
        {tab === "admin" && isPlatform && data.emailPreviews.length > 0 && (
          <section className="kc-detail-section">
            <h2>{t("Local email previews — no emails sent")}</h2>
            {data.emailPreviews.map((m) => (
              <article key={m.id} className="card kc-work-card">
                <h3>{m.subject}</h3>
                <p>{m.recipient}</p>
                <p style={{ overflowWrap: "anywhere" }}>{m.body}</p>
              </article>
            ))}
          </section>
        )}
      </section>
      {operation && (
        <OperationDialog
          operation={operation}
          busy={busy}
          error={actionError}
          onClose={() => setOperation(null)}
          submit={run}
        />
      )}
    </div>
  );
}
function OperationDialog({
  operation,
  busy,
  error,
  onClose,
  submit,
}: {
  operation: Operation;
  busy: boolean;
  error: string;
  onClose: () => void;
  submit: (payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const t = useTranslations(),
    [uploading, setUploading] = useState(false),
    [localError, setLocalError] = useState("");
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || uploading) return;
    const f = new FormData(e.currentTarget),
      values: Values = {};
    setLocalError("");
    try {
      for (const field of operation.fields) {
        if (field.type === "file") {
          const file = f.get(field.key);
          if (file instanceof File && file.size) {
            setUploading(true);
            const body = new FormData();
            body.set("file", file);
            body.set("kind", "vehicle");
            const r = await fetch("/api/rental-media", {
              method: "POST",
              body,
            });
            const result = await r.json();
            if (!r.ok) throw new Error(result.error);
            values[field.key] = result.src;
          } else values[field.key] = "";
        } else values[field.key] = String(f.get(field.key) || "");
      }
      await submit(operation.build(values));
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <Modal title={t(operation.title)} onClose={onClose}>
      <form
        className="kc-operation-form"
        onSubmit={save}
        aria-busy={busy || uploading}
      >
        {operation.fields.map((field) => {
          if (field.type === "photos")
            return (
              <RentalPhotoField
                key={field.key}
                name={field.key}
                initial={JSON.parse(String(field.value || "[]"))}
                disabled={busy}
                onBusyChange={setUploading}
              />
            );
          const control = field.options ? (
            <Dropdown
              label={t(field.label)}
              name={field.key}
              defaultValue={field.value}
              required={field.required}
            >
              {field.options.length === 0 && (
                <option value="">{t("No records available")}</option>
              )}
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.label)}
                </option>
              ))}
            </Dropdown>
          ) : field.type === "textarea" ? (
            <textarea
              name={field.key}
              defaultValue={field.value}
              required={field.required}
              maxLength={12000}
            />
          ) : (
            <input
              name={field.key}
              type={field.type || "text"}
              defaultValue={
                field.type === "file" || field.type === "checkbox"
                  ? undefined
                  : field.value
              }
              defaultChecked={field.type === "checkbox" && field.value === "on"}
              required={field.required}
              min={field.min}
              max={field.max}
              step={field.type === "number" ? "0.01" : undefined}
              accept={
                field.type === "file"
                  ? "image/jpeg,image/png,image/webp"
                  : undefined
              }
              maxLength={field.type === "file" ? undefined : 1000}
            />
          );
          if (field.options) return <div key={field.key}>{control}</div>;
          return (
            <label
              key={field.key}
              className={
                field.type === "checkbox" ? "kc-compare-check" : undefined
              }
            >
              {field.type === "checkbox" && control}
              {t(field.label)}
              {field.type !== "checkbox" && control}
            </label>
          );
        })}
        <p className="muted">
          {t(
            "Rental times use Africa/Casablanca. Financial amounts are in MAD.",
          )}
        </p>
        {(error || localError) && (
          <p className="error-note" role="alert">
            {t(error || localError)}
          </p>
        )}
        <div className="row">
          <button className="button" disabled={busy || uploading}>
            {t(uploading ? "Uploading photos…" : busy ? "Saving…" : "Save")}
          </button>
          <button
            className="button secondary"
            type="button"
            disabled={busy || uploading}
            onClick={onClose}
          >
            {t("Cancel")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
