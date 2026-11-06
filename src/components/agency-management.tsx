"use client";
import Dropdown from "./dropdown";
import { useState, useId } from "react";
import Link from "next/link";
import Image from "next/image";
import CarPhotoPicker from "./car-photo-picker";
import useSWR from "swr";
import {
  Plus,
  Pencil,
  Printer,
  Users,
  CarFront,
  FileText,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { fetchJson } from "@/lib/client";
import { today } from "@/lib/catalog";
import { invoiceState, vehicleAttention } from "@/lib/management";
import type {
  Contact,
  Vehicle,
  Invoice,
  DashboardData,
  ManagementData,
} from "@/lib/types";
import { Badge, Empty, Modal, Toast } from "./ui";
import { PageIntro } from "./dashboard-parts";
import type { CarPhoto } from "@/lib/car-photos";

function amount(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    cents / 100,
  );
}
type Save = (value: Record<string, unknown>) => Promise<void>;
export default function AgencyManagement({
  section,
  workspace,
}: {
  section: string;
  workspace: DashboardData;
}) {
  const t = useTranslations();
  const { data, error, isLoading, mutate } = useSWR<ManagementData>(
    `/api/management?viewer=${encodeURIComponent(workspace.session.id)}`,
    fetchJson,
    { dedupingInterval: 30000 },
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [contact, setContact] = useState<Contact | "new" | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | "new" | null>(null);
  const [invoice, setInvoice] = useState<Invoice | "new" | null>(null);
  const [viewContact, setViewContact] = useState<Contact | null>(null);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [payment, setPayment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const viewInvoice = data?.invoices.find((i) => i.id === viewInvoiceId);
  const contacts = data?.contacts || [],
    vehicles = data?.vehicles || [],
    invoices = data?.invoices || [];
  const query = search.toLocaleLowerCase(t.locale);
  function matches(values: string[]) {
    return values.join(" ").toLocaleLowerCase(t.locale).includes(query);
  }
  function open(fn: () => void) {
    setActionError("");
    fn();
  }
  const save: Save = async (body) => {
    setBusy(true);
    setActionError("");
    try {
      const res = await fetch("/api/management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) {
        if (res.status === 409) await mutate();
        throw new Error(result.error);
      }
      await mutate();
      setContact(null);
      setVehicle(null);
      setInvoice(null);
      setPayment(false);
      setNotice("Record saved");
      if (body.action === "invoice") setViewInvoiceId(result.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const totals = ["EUR", "MAD"].map((currency) => ({
    currency,
    balance: invoices
      .filter((i) => i.currency === currency && i.status === "issued")
      .reduce((sum, i) => sum + i.total - i.paid, 0),
  }));
  if (isLoading && !data)
    return (
      <div className="card skeleton" role="status">
        <span className="sr-only">{t("Loading management records")}</span>
      </div>
    );
  if (error && !data)
    return (
      <div className="card">
        <Empty
          headingLevel={1}
          title={t("Management records unavailable")}
          description={error.message}
        >
          <button className="button" onClick={() => void mutate()}>
            {t("Try again")}
          </button>
        </Empty>
      </div>
    );
  if (!data) return null;
  const summary = (
    <div className="management-metrics">
      <Link className="card" href="/agency/contacts">
        <Users aria-hidden="true" focusable="false" size={20} />
        <strong>{contacts.filter((c) => c.status === "active").length}</strong>
        <span>{t("Active contacts")}</span>
      </Link>
      <Link className="card" href="/agency/vehicles">
        <CarFront aria-hidden="true" focusable="false" size={20} />
        <strong>
          {vehicles.filter((v) => v.status === "available").length} /{" "}
          {vehicles.length}
        </strong>
        <span>{t("Cars ready / total fleet")}</span>
      </Link>
      <Link className="card" href="/agency/invoices">
        <FileText aria-hidden="true" focusable="false" size={20} />
        <strong>
          {
            invoices.filter((i) => invoiceState(i, today()) === "overdue")
              .length
          }
        </strong>
        <span>{t("Overdue invoices")}</span>
      </Link>
      <div className="card">
        <span>{t("Outstanding balance")}</span>
        {totals.map((v) => (
          <strong key={v.currency}>
            {amount(v.balance, v.currency, t.locale)}
          </strong>
        ))}
      </div>
    </div>
  );
  if (section === "summary")
    return (
      <section className="management-summary">
        <h2>{t("Daily operations")}</h2>
        {summary}
        <Link className="text-link" href="/agency/contracts">
          {t("Manage rental contracts")}
        </Link>
      </section>
    );
  const title =
    section === "contacts"
      ? "Clients"
      : section === "vehicles"
        ? "Fleet overview"
        : "Invoices";
  const listContacts = contacts.filter(
    (c) =>
      (filter === "all" || c.status === filter) &&
      matches([c.name, c.company, c.email, c.phone]),
  );
  const listVehicles = vehicles.filter(
    (v) =>
      (filter === "attention"
        ? vehicleAttention(v, today()).length > 0
        : filter === "all" || v.status === filter) &&
      matches([v.name, v.plate, v.city]),
  );
  const listInvoices = invoices.filter(
    (i) =>
      (filter === "all" || invoiceState(i, today()) === filter) &&
      matches([
        i.number || "",
        i.customer.name,
        i.customer.company,
        i.bookingId,
      ]),
  );
  return (
    <section className="agency-management">
      {error && (
        <p className="error-note" role="alert">
          {t(error.message)}{" "}
          <button className="button ghost" onClick={() => void mutate()}>
            {t("Try again")}
          </button>
        </p>
      )}
      <PageIntro
        title={title}
        text={
          section === "contacts"
            ? "Keep your customers, companies and rental history together."
            : section === "vehicles"
              ? "Track each physical car, its condition and the next service."
              : "Create invoices, follow balances and record payments received."
        }
      >
        <button
          className="button"
          onClick={() =>
            open(() =>
              section === "contacts"
                ? setContact("new")
                : section === "vehicles"
                  ? setVehicle("new")
                  : setInvoice("new"),
            )
          }
        >
          <Plus aria-hidden="true" focusable="false" size={16} />
          {t(
            section === "contacts"
              ? "New client"
              : section === "vehicles"
                ? "Add vehicle"
                : "New invoice",
          )}
        </button>
      </PageIntro>
      {summary}
      {section === "vehicles" && (
        <div
          className="fleet-status-summary"
          aria-label={t("Fleet status totals")}
        >
          {["available", "rented", "maintenance", "inactive"].map((status) => (
            <button
              key={status}
              className={`button ${filter === status ? "" : "secondary"}`}
              onClick={() => setFilter(filter === status ? "all" : status)}
            >
              {t(status.replace(/^./, (c) => c.toUpperCase()))} ·{" "}
              {vehicles.filter((v) => v.status === status).length}
            </button>
          ))}
        </div>
      )}
      {section === "vehicles" && (
        <div className="notice">
          {t(
            "Fleet status is updated by your team. Public listings describe models; they do not allocate a physical car to a reservation.",
          )}
        </div>
      )}
      <div className="management-toolbar card">
        <p
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {t("{0} records shown", {
            "0":
              section === "contacts"
                ? listContacts.length
                : section === "vehicles"
                  ? listVehicles.length
                  : listInvoices.length,
          })}
        </p>
        <label>
          {t("Search records")}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search by name or reference")}
          />
        </label>
        <Dropdown
          label={<>{t("Status")}</>}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{t("All records")}</option>
          {(section === "contacts"
            ? ["active", "archived"]
            : section === "vehicles"
              ? ["available", "rented", "maintenance", "inactive", "attention"]
              : ["draft", "issued", "partially_paid", "paid", "overdue", "void"]
          ).map((s) => (
            <option key={s} value={s}>
              {t(s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()))}
            </option>
          ))}
        </Dropdown>
      </div>
      {section === "contacts" ? (
        <div className="management-grid">
          {listContacts.map((c) => (
            <article className="card management-card" key={c.id}>
              <div className="row between">
                <h2>{c.name}</h2>
                <Badge status={c.status} />
              </div>
              <p className="muted">{c.company || t("Individual customer")}</p>
              <p>
                {c.email || "—"}
                <br />
                {c.phone || "—"}
              </p>
              <div className="row">
                <button
                  className="button secondary"
                  onClick={() => setViewContact(c)}
                >
                  {t("View history")}
                </button>
                <button
                  className="button ghost"
                  onClick={() => open(() => setContact(c))}
                >
                  <Pencil aria-hidden="true" focusable="false" size={14} />
                  {t("Edit")}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : section === "vehicles" ? (
        <div className="management-grid">
          {listVehicles.map((v) => (
            <article className="card management-card" key={v.id}>
              <div className="fleet-car-photo">
                {v.photos?.[0] ? (
                  <Image
                    src={v.photos[0].src}
                    alt={v.photos[0].description || v.name}
                    fill
                    unoptimized
                    sizes="(max-width:640px) 90vw, 400px"
                  />
                ) : (
                  <div className="fleet-photo-placeholder">
                    <CarFront size={48} aria-hidden="true" />
                    <span>{t("Add photos of this car")}</span>
                  </div>
                )}
              </div>
              <div className="row between">
                <span className="vehicle-plate">{v.plate}</span>
                <Badge status={v.status} />
              </div>
              <h2>{v.name}</h2>
              <p className="muted">
                {v.year} · {v.city}
              </p>
              <dl className="management-details">
                <div>
                  <dt>{t("Mileage")}</dt>
                  <dd>{v.mileage.toLocaleString(t.locale)} km</dd>
                </div>
                <div>
                  <dt>{t("Service at")}</dt>
                  <dd>
                    {v.serviceMileage
                      ? `${v.serviceMileage.toLocaleString(t.locale)} km`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>{t("Service date")}</dt>
                  <dd>{v.serviceDue || "—"}</dd>
                </div>
                <div>
                  <dt>{t("Insurance renewal")}</dt>
                  <dd>{v.insuranceDue || "—"}</dd>
                </div>
                <div>
                  <dt>{t("Linked listing")}</dt>
                  <dd>
                    {workspace.listings.find((l) => l.id === v.listingId)
                      ?.name || t("Not linked")}
                  </dd>
                </div>
              </dl>
              {vehicleAttention(v, today()).map((a) => (
                <p className="management-alert" key={a}>
                  <AlertTriangle
                    aria-hidden="true"
                    focusable="false"
                    size={15}
                  />
                  {t(a)}
                </p>
              ))}
              <button
                className="button secondary"
                onClick={() => open(() => setVehicle(v))}
              >
                <Pencil aria-hidden="true" focusable="false" size={14} />
                {t("Manage vehicle")}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="management-grid">
          {listInvoices.map((i) => (
            <article className="card management-card" key={i.id}>
              <div className="row between">
                <strong>{i.number || t("Draft invoice")}</strong>
                <Badge status={invoiceState(i, today())} />
              </div>
              <h2>{i.customer.name}</h2>
              <p className="muted">
                {t("Due date")}: {i.dueDate}
              </p>
              <div className="invoice-amount">
                {amount(i.total, i.currency, t.locale)}
              </div>
              <p>
                {t("Balance")}:{" "}
                {amount(
                  i.status === "void" ? 0 : i.total - i.paid,
                  i.currency,
                  t.locale,
                )}
              </p>
              <div className="row">
                <button
                  className="button secondary"
                  onClick={() =>
                    open(() => {
                      setViewInvoiceId(i.id);
                      setPayment(false);
                    })
                  }
                >
                  {t("View invoice")}
                </button>
                {i.status === "draft" && (
                  <button
                    className="button ghost"
                    onClick={() => open(() => setInvoice(i))}
                  >
                    {t("Edit")}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {(section === "contacts"
        ? !listContacts.length
        : section === "vehicles"
          ? !listVehicles.length
          : !listInvoices.length) && (
        <div className="card">
          <Empty
            title={t("No records to show")}
            description={t(
              "Add your first record or adjust the search and status filters.",
            )}
          />
        </div>
      )}
      {contact && (
        <Modal
          title={contact === "new" ? "New client" : "Edit client"}
          onClose={() => !busy && setContact(null)}
        >
          <ContactForm
            contact={contact === "new" ? undefined : contact}
            workspace={workspace}
            busy={busy}
            error={actionError}
            onSave={save}
          />
        </Modal>
      )}
      {vehicle && (
        <Modal
          title={vehicle === "new" ? "Add vehicle" : "Manage vehicle"}
          onClose={() => !busy && setVehicle(null)}
        >
          <VehicleForm
            vehicle={vehicle === "new" ? undefined : vehicle}
            workspace={workspace}
            busy={busy}
            error={actionError}
            onSave={save}
          />
        </Modal>
      )}
      {invoice && (
        <Modal
          title={invoice === "new" ? "New invoice" : "Edit invoice"}
          onClose={() => !busy && setInvoice(null)}
        >
          <InvoiceForm
            invoice={invoice === "new" ? undefined : invoice}
            contacts={contacts}
            workspace={workspace}
            busy={busy}
            error={actionError}
            onSave={save}
          />
        </Modal>
      )}
      {viewContact && (
        <Modal title="Client history" onClose={() => setViewContact(null)}>
          <h3>{viewContact.name}</h3>
          <p>
            {viewContact.company}
            <br />
            {viewContact.address}
          </p>
          <p className="management-notes">{viewContact.notes}</p>
          <h3>{t("Reservations")}</h3>
          {workspace.bookings
            .filter(
              (b) =>
                viewContact.email &&
                b.email.toLowerCase() === viewContact.email.toLowerCase(),
            )
            .map((b) => (
              <p key={b.id}>
                <Link
                  className="text-link"
                  href={`/agency/bookings?q=${encodeURIComponent(b.id)}`}
                >
                  {b.id} · {b.listingName}
                </Link>
                <br />
                {b.start} → {b.end} · {t(b.status)}
              </p>
            ))}
          <p className="muted">
            {t("Reservation history is matched by customer email.")}
          </p>
          <h3>{t("Contracts")}</h3>
          <p>
            <Link
              className="text-link"
              href={`/agency/contracts?contact=${viewContact.id}`}
            >
              {t("View contracts")}
            </Link>
          </p>
          <h3>{t("Invoices")}</h3>
          {invoices
            .filter((i) => i.contactId === viewContact.id)
            .map((i) => (
              <p key={i.id}>
                {i.number || t("Draft invoice")} ·{" "}
                {amount(i.total, i.currency, t.locale)} ·{" "}
                {t(invoiceState(i, today()).replaceAll("_", " "))}
              </p>
            ))}
        </Modal>
      )}
      {viewInvoice && !invoice && (
        <Modal
          title="Invoice details"
          onClose={() => !busy && setViewInvoiceId(null)}
        >
          <InvoiceDocument invoice={viewInvoice} />
          <div className="stack management-no-print">
            {actionError && (
              <p role="alert" className="form-error">
                {t(actionError)}
              </p>
            )}
            <div className="row management-actions">
              <button
                className="button secondary"
                onClick={() => window.print()}
              >
                <Printer aria-hidden="true" focusable="false" size={15} />
                {t("Print / Save PDF")}
              </button>
              {viewInvoice.status === "draft" && (
                <>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => open(() => setInvoice(viewInvoice))}
                  >
                    {t("Edit draft")}
                  </button>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      void save({
                        action: "issue",
                        id: viewInvoice.id,
                        version: viewInvoice.version,
                      })
                    }
                  >
                    {t("Issue invoice")}
                  </button>
                </>
              )}
              {viewInvoice.status === "issued" &&
                viewInvoice.paid < viewInvoice.total && (
                  <button
                    className="button"
                    onClick={() => setPayment(!payment)}
                  >
                    {t("Record payment")}
                  </button>
                )}
            </div>
            {viewInvoice.status === "draft" && (
              <p className="muted">
                {t(
                  "Issuing assigns an invoice number and locks the customer, prices and dates. Review the details first.",
                )}
              </p>
            )}
            {payment && (
              <PaymentForm
                key={viewInvoice.version}
                invoice={viewInvoice}
                busy={busy}
                onSave={save}
              />
            )}
            {viewInvoice.status !== "void" && viewInvoice.paid === 0 && (
              <details>
                <summary>{t("Void this invoice")}</summary>
                <p>
                  {t(
                    "Voiding preserves the record and removes its outstanding balance. It cannot be issued again.",
                  )}
                </p>
                <button
                  className="button danger"
                  disabled={busy}
                  onClick={() =>
                    void save({
                      action: "void",
                      id: viewInvoice.id,
                      version: viewInvoice.version,
                    })
                  }
                >
                  {t("Confirm void")}
                </button>
              </details>
            )}
          </div>
        </Modal>
      )}
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}
    </section>
  );
}

function FormEnd({ busy, error }: { busy: boolean; error: string }) {
  const t = useTranslations();
  return (
    <>
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
      <button className="button" disabled={busy}>
        {t(busy ? "Saving…" : "Save record")}
      </button>
    </>
  );
}
function ContactForm({
  contact,
  workspace,
  busy,
  error,
  onSave,
}: {
  contact?: Contact;
  workspace: DashboardData;
  busy: boolean;
  error: string;
  onSave: Save;
}) {
  const t = useTranslations();
  const [id] = useState(() => contact?.id || crypto.randomUUID());
  const [form, setForm] = useState({
    clientType: contact?.clientType || "individual",
    country: contact?.country || "",
    ICE: contact?.ICE || "",
    billingName: contact?.billingName || "",
    name: contact?.name || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    company: contact?.company || "",
    address: contact?.address || "",
    notes: contact?.notes || "",
    status: contact?.status || "active",
  });
  return (
    <form
      aria-busy={busy}
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          ...form,
          action: "contact",
          id,
          version: contact?.version || 0,
        });
      }}
    >
      <Dropdown
        label={<>{t("Client type")}</>}
        value={form.clientType}
        onChange={(e) =>
          setForm({
            ...form,
            clientType: e.target.value as "individual" | "company",
          })
        }
      >
        <option value="individual">{t("Individual")}</option>
        <option value="company">{t("Company")}</option>
      </Dropdown>
      <div className="field-grid">
        <label>
          {t("Country")}
          <input
            value={form.country}
            maxLength={100}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
        </label>
        <label>
          {t("Client ICE (if applicable)")}
          <input
            value={form.ICE}
            maxLength={30}
            onChange={(e) => setForm({ ...form, ICE: e.target.value })}
          />
        </label>
      </div>
      <label>
        {t("Invoice recipient")}
        <input
          value={form.billingName}
          maxLength={160}
          onChange={(e) => setForm({ ...form, billingName: e.target.value })}
        />
      </label>
      {!contact && (
        <Dropdown
          label={<>{t("Prefill from reservation")}</>}
          defaultValue=""
          onChange={(e) => {
            const b = workspace.bookings.find((b) => b.id === e.target.value);
            if (b)
              setForm({
                ...form,
                name: b.name,
                email: b.email,
                phone: b.phone,
              });
          }}
        >
          <option value="">{t("Enter details manually")}</option>
          {workspace.bookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.id} · {b.name}
            </option>
          ))}
        </Dropdown>
      )}
      <label>
        {t("Full name")}
        <input
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>
      <div className="field-grid">
        <label>
          {t("Email")}
          <input
            autoComplete="email"
            type="email"
            maxLength={200}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          {t("Phone")}
          <input
            autoComplete="tel"
            type="tel"
            maxLength={40}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
      </div>
      <label>
        {t("Company")}
        <input
          maxLength={160}
          autoComplete="organization"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
      </label>
      <label>
        {t("Billing address")}
        <textarea
          maxLength={500}
          autoComplete="street-address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </label>
      <label>
        {t("Notes")}
        <textarea
          maxLength={2000}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </label>
      <Dropdown
        label={<>{t("Status")}</>}
        value={form.status}
        onChange={(e) =>
          setForm({ ...form, status: e.target.value as Contact["status"] })
        }
      >
        <option value="active">{t("Active")}</option>
        <option value="archived">{t("Archived")}</option>
      </Dropdown>
      <FormEnd busy={busy} error={error} />
    </form>
  );
}
function VehicleForm({
  vehicle,
  workspace,
  busy,
  error,
  onSave,
}: {
  vehicle?: Vehicle;
  workspace: DashboardData;
  busy: boolean;
  error: string;
  onSave: Save;
}) {
  const t = useTranslations();
  const serviceHelpId = useId();
  const [photos, setPhotos] = useState<CarPhoto[]>(vehicle?.photos || []);
  const [uploading, setUploading] = useState(false);
  const [id] = useState(() => vehicle?.id || crypto.randomUUID());
  const [form, setForm] = useState({
    name: vehicle?.name || "",
    plate: vehicle?.plate || "",
    listingId: vehicle?.listingId || "",
    city: vehicle?.city || workspace.agencies[0]?.city || "",
    year: vehicle?.year || new Date().getFullYear(),
    mileage: vehicle?.mileage || 0,
    status: vehicle?.status || "available",
    insuranceDue: vehicle?.insuranceDue || "",
    serviceDue: vehicle?.serviceDue || "",
    serviceMileage: vehicle?.serviceMileage || 0,
    notes: vehicle?.notes || "",
  });
  return (
    <form
      aria-busy={busy}
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (uploading) return;
        void onSave({
          ...form,
          photos,
          action: "vehicle",
          id,
          version: vehicle?.version || 0,
        });
      }}
    >
      <CarPhotoPicker
        photos={photos}
        onChange={setPhotos}
        agencyId={workspace.session.agencyId}
        disabled={busy}
        onBusyChange={setUploading}
      />
      <p className="muted">
        {t(
          "Fleet photos stay private. Add photos to a published rental listing to show them to travelers.",
        )}
      </p>
      <label>
        {t("Vehicle name")}
        <input
          required
          minLength={2}
          maxLength={120}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>
      <div className="field-grid">
        <label>
          {t("Registration plate")}
          <input
            required
            minLength={2}
            maxLength={30}
            value={form.plate}
            onChange={(e) => setForm({ ...form, plate: e.target.value })}
          />
        </label>
        <label>
          {t("Year")}
          <input
            required
            type="number"
            min={1980}
            max={new Date().getFullYear() + 2}
            value={form.year}
            onChange={(e) => setForm({ ...form, year: +e.target.value })}
          />
        </label>
      </div>
      <div className="field-grid">
        <label>
          {t("City")}
          <input
            required
            minLength={2}
            maxLength={100}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </label>
        <label>
          {t("Mileage (km)")}
          <input
            required
            type="number"
            min={0}
            max={5000000}
            value={form.mileage}
            onChange={(e) => setForm({ ...form, mileage: +e.target.value })}
          />
        </label>
      </div>
      <Dropdown
        label={<>{t("Linked listing")}</>}
        value={form.listingId}
        onChange={(e) => setForm({ ...form, listingId: e.target.value })}
      >
        <option value="">{t("Not linked")}</option>
        {workspace.listings
          .filter((l) => l.category === "cars")
          .map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
      </Dropdown>
      <Dropdown
        label={<>{t("Operating status")}</>}
        value={form.status}
        onChange={(e) =>
          setForm({ ...form, status: e.target.value as Vehicle["status"] })
        }
      >
        {["available", "rented", "maintenance", "inactive"].map((s) => (
          <option key={s} value={s}>
            {t(s.replace(/^./, (c) => c.toUpperCase()))}
          </option>
        ))}
      </Dropdown>
      <div className="field-grid">
        <label>
          {t("Insurance renewal")}
          <input
            type="date"
            value={form.insuranceDue}
            onChange={(e) => setForm({ ...form, insuranceDue: e.target.value })}
          />
        </label>
        <label>
          {t("Service date")}
          <input
            type="date"
            value={form.serviceDue}
            onChange={(e) => setForm({ ...form, serviceDue: e.target.value })}
          />
        </label>
      </div>
      <label>
        {t("Next service mileage (km)")}
        <input
          aria-describedby={serviceHelpId}
          type="number"
          min={0}
          max={5000000}
          value={form.serviceMileage}
          onChange={(e) =>
            setForm({ ...form, serviceMileage: +e.target.value })
          }
        />
      </label>
      <small className="muted" id={serviceHelpId}>
        {t("Use zero if no mileage reminder is set.")}
      </small>
      <label>
        {t("Notes")}
        <textarea
          maxLength={2000}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </label>
      <FormEnd busy={busy || uploading} error={error} />
    </form>
  );
}
function InvoiceForm({
  invoice,
  contacts,
  workspace,
  busy,
  error,
  onSave,
}: {
  invoice?: Invoice;
  contacts: Contact[];
  workspace: DashboardData;
  busy: boolean;
  error: string;
  onSave: Save;
}) {
  const t = useTranslations();
  const currencyHelpId = useId();
  const [id] = useState(() => invoice?.id || crypto.randomUUID());
  const [form, setForm] = useState({
    contactId: invoice?.contactId || "",
    bookingId: invoice?.bookingId || "",
    issueDate: invoice?.issueDate || today(),
    dueDate: invoice?.dueDate || today(),
    currency: invoice?.currency || "EUR",
    notes: invoice?.notes || "",
  });
  const [items, setItems] = useState(
    () =>
      invoice?.items.map((i) => ({
        ...i,
        key: crypto.randomUUID(),
        price: (i.unitPrice / 100).toFixed(2),
      })) || [
        {
          key: crypto.randomUUID(),
          description: "",
          quantity: 1,
          unitPrice: 0,
          price: "",
        },
      ],
  );
  const total = items.reduce(
    (sum, i) => sum + i.quantity * Math.round(Number(i.price || 0) * 100),
    0,
  );
  return (
    <form
      aria-busy={busy}
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          ...form,
          items: items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: Math.round(Number(i.price) * 100),
          })),
          action: "invoice",
          id,
          version: invoice?.version || 0,
        });
      }}
    >
      <Dropdown
        label={<>{t("Customer")}</>}
        required
        value={form.contactId}
        onChange={(e) => setForm({ ...form, contactId: e.target.value })}
      >
        <option value="">{t("Choose a contact")}</option>
        {contacts
          .filter((c) => c.status === "active")
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.company ? ` · ${c.company}` : ""}
            </option>
          ))}
      </Dropdown>
      {!contacts.some((c) => c.status === "active") && (
        <p className="notice">
          {t("Create an active contact before creating an invoice.")}
        </p>
      )}
      <Dropdown
        label={<>{t("Reservation (optional)")}</>}
        value={form.bookingId}
        onChange={(e) => {
          const b = workspace.bookings.find((b) => b.id === e.target.value);
          setForm({
            ...form,
            bookingId: e.target.value,
            ...(b ? { currency: "EUR" as const } : {}),
          });
          if (b)
            setItems([
              {
                key: crypto.randomUUID(),
                description: `${b.listingName} · ${b.start} → ${b.end}`,
                quantity: 1,
                unitPrice: b.total,
                price: (b.total / 100).toFixed(2),
              },
            ]);
        }}
      >
        <option value="">{t("Standalone invoice")}</option>
        {workspace.bookings.map((b) => (
          <option key={b.id} value={b.id}>
            {b.id} · {b.name}
          </option>
        ))}
      </Dropdown>
      <div className="field-grid">
        <label>
          {t("Invoice date")}
          <input
            required
            type="date"
            value={form.issueDate}
            onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
          />
        </label>
        <label>
          {t("Due date")}
          <input
            required
            type="date"
            min={form.issueDate}
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </label>
      </div>
      <Dropdown
        label={<>{t("Currency")}</>}
        aria-describedby={currencyHelpId}
        value={form.currency}
        onChange={(e) =>
          setForm({
            ...form,
            currency: e.target.value as Invoice["currency"],
          })
        }
      >
        <option value="EUR">EUR</option>
        <option value="MAD">MAD</option>
      </Dropdown>
      <small className="muted" id={currencyHelpId}>
        {t(
          "Amounts are entered in the selected currency. No currency conversion is applied.",
        )}
      </small>
      <fieldset className="invoice-items">
        <legend>{t("Line items")}</legend>
        {items.map((item, index) => (
          <div className="invoice-item" key={item.key}>
            <label>
              {t("Description")}
              <input
                required
                maxLength={300}
                value={item.description}
                onChange={(e) =>
                  setItems(
                    items.map((i) =>
                      i.key === item.key
                        ? { ...i, description: e.target.value }
                        : i,
                    ),
                  )
                }
              />
            </label>
            <div className="field-grid">
              <label>
                {t("Quantity")}
                <input
                  required
                  type="number"
                  min={1}
                  max={10000}
                  value={item.quantity}
                  onChange={(e) =>
                    setItems(
                      items.map((i) =>
                        i.key === item.key
                          ? { ...i, quantity: +e.target.value }
                          : i,
                      ),
                    )
                  }
                />
              </label>
              <label>
                {t("Unit price")}
                <input
                  required
                  type="number"
                  min={0}
                  max={1000000}
                  step="0.01"
                  value={item.price}
                  onChange={(e) =>
                    setItems(
                      items.map((i) =>
                        i.key === item.key
                          ? { ...i, price: e.target.value }
                          : i,
                      ),
                    )
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="button ghost"
              disabled={items.length === 1}
              aria-label={t("Remove line {0}", { "0": index + 1 })}
              onClick={() => setItems(items.filter((i) => i.key !== item.key))}
            >
              <Trash2 aria-hidden="true" focusable="false" size={14} />
              {t("Remove line")}
            </button>
          </div>
        ))}
      </fieldset>
      <button
        type="button"
        className="button secondary"
        disabled={items.length >= 30}
        onClick={() =>
          setItems([
            ...items,
            {
              key: crypto.randomUUID(),
              description: "",
              quantity: 1,
              unitPrice: 0,
              price: "",
            },
          ])
        }
      >
        {t("Add line item")}
      </button>
      <strong>
        {t("Total")}: {amount(total, form.currency, t.locale)}
      </strong>
      <p className="muted">
        {t(
          "No automatic tax calculation is applied. Review all line items before issuing.",
        )}
      </p>
      <label>
        {t("Invoice notes")}
        <textarea
          maxLength={2000}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </label>
      <FormEnd busy={busy} error={error} />
    </form>
  );
}
function PaymentForm({
  invoice,
  busy,
  onSave,
}: {
  invoice: Invoice;
  busy: boolean;
  onSave: Save;
}) {
  const t = useTranslations();
  return (
    <form
      aria-busy={busy}
      className="stack card"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void onSave({
          action: "payment",
          id: invoice.id,
          version: invoice.version,
          amount: Math.round(Number(f.get("amount")) * 100),
          date: f.get("date"),
          reference: f.get("reference"),
        });
      }}
    >
      <p>
        {t(
          "Record money already received. This does not charge a card or confirm a reservation.",
        )}
      </p>
      <label>
        {t("Payment amount")}
        <input
          required
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={(invoice.total - invoice.paid) / 100}
          defaultValue={((invoice.total - invoice.paid) / 100).toFixed(2)}
        />
      </label>
      <label>
        {t("Payment date")}
        <input
          required
          name="date"
          type="date"
          max={today()}
          defaultValue={today()}
        />
      </label>
      <label>
        {t("Payment reference")}
        <input required name="reference" minLength={2} maxLength={200} />
      </label>
      <button className="button" disabled={busy}>
        {t("Save payment")}
      </button>
    </form>
  );
}
function InvoiceDocument({ invoice: i }: { invoice: Invoice }) {
  const t = useTranslations();
  return (
    <article className="invoice-document">
      <div className="invoice-document-head">
        <div>
          <span className="eyebrow">{t("Invoice")}</span>
          <h2>{i.number || t("DRAFT — Not issued")}</h2>
          <Badge status={invoiceState(i, today())} />
        </div>
        <div>
          <strong>{i.issuer.name}</strong>
          <p>
            {i.issuer.address}
            <br />
            {i.issuer.email}
            <br />
            {i.issuer.phone}
          </p>
          {i.issuer.registration && (
            <p>
              {t("Registration")}: {i.issuer.registration}
            </p>
          )}
          {i.issuer.taxId && (
            <p>
              {t("Business tax identifier")}: {i.issuer.taxId}
            </p>
          )}
        </div>
      </div>
      <div className="invoice-document-head">
        <div>
          <h3>{t("Bill to")}</h3>
          <strong>{i.customer.name}</strong>
          <p className="management-notes">
            {[
              i.customer.company,
              i.customer.address,
              i.customer.email,
              i.customer.phone,
            ]
              .filter(Boolean)
              .join("\n")}
          </p>
        </div>
        <div>
          <p>
            {t("Invoice date")}: {i.issueDate}
            <br />
            {t("Due date")}: {i.dueDate}
            <br />
            {t("Currency")}: {i.currency}
          </p>
          {i.bookingId && (
            <p>
              {t("Reservation")}: {i.bookingId}
            </p>
          )}
        </div>
      </div>
      <div className="invoice-lines">
        {i.items.map((item, index) => (
          <div className="invoice-line" key={index}>
            <span>
              {item.description}
              <small>
                {item.quantity} × {amount(item.unitPrice, i.currency, t.locale)}
              </small>
            </span>
            <strong>
              {amount(item.quantity * item.unitPrice, i.currency, t.locale)}
            </strong>
          </div>
        ))}
      </div>
      <dl className="invoice-totals">
        <div>
          <dt>{t("Total")}</dt>
          <dd>{amount(i.total, i.currency, t.locale)}</dd>
        </div>
        <div>
          <dt>{t("Payments recorded")}</dt>
          <dd>{amount(i.paid, i.currency, t.locale)}</dd>
        </div>
        <div>
          <dt>{t("Balance")}</dt>
          <dd>
            {amount(
              i.status === "void" ? 0 : i.total - i.paid,
              i.currency,
              t.locale,
            )}
          </dd>
        </div>
      </dl>
      <p className="management-notes">{i.notes}</p>
      {i.payments.length > 0 && (
        <>
          <h3>{t("Payment history")}</h3>
          {i.payments.map((p) => (
            <p key={p.id}>
              {p.date} · {amount(p.amount, i.currency, t.locale)} ·{" "}
              {p.reference}
            </p>
          ))}
        </>
      )}
    </article>
  );
}
