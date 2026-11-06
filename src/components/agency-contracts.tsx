"use client";
import Dropdown from "./dropdown";
import { useState, type InputHTMLAttributes } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Plus, Printer, Pencil } from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { fetchJson } from "@/lib/client";
import { today } from "@/lib/catalog";
import { contractQuote, fuelLabels, fuelLevels } from "@/lib/contracts";
import type {
  DashboardData,
  ManagementData,
  RentalContract,
} from "@/lib/types";
import { Badge, Empty, Modal, Toast } from "./ui";
import { PageIntro } from "./dashboard-parts";

type Save = (body: Record<string, unknown>) => Promise<void>;
function money(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    cents / 100,
  );
}

export default function AgencyContracts({
  workspace,
}: {
  workspace: DashboardData;
}) {
  const t = useTranslations(),
    params = useSearchParams();
  const key = `/api/contracts?viewer=${encodeURIComponent(workspace.session.id)}`;
  const {
    data: contracts,
    error,
    isLoading,
    mutate,
  } = useSWR<RentalContract[]>(key, fetchJson, { dedupingInterval: 30000 });
  const {
    data: management,
    error: managementError,
    mutate: reloadManagement,
  } = useSWR<ManagementData>(
    `/api/management?viewer=${encodeURIComponent(workspace.session.id)}`,
    fetchJson,
    { dedupingInterval: 30000 },
  );
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [editing, setEditing] = useState<RentalContract | "new" | null>(null),
    [viewId, setViewId] = useState<string | null>(null),
    [returnOpen, setReturnOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [notice, setNotice] = useState("");
  const records = contracts || [],
    view = records.find((c) => c.id === viewId),
    contactId = params.get("contact") || "",
    vehicleId = params.get("vehicle") || "";
  const visible = records.filter(
    (c) =>
      (status === "all" || c.status === status) &&
      (!contactId || c.contactId === contactId) &&
      (!vehicleId || c.vehicleId === vehicleId) &&
      [
        c.number || "",
        c.customer.name,
        c.vehicle.name,
        c.vehicle.plate,
        c.bookingId,
      ]
        .join(" ")
        .toLocaleLowerCase(t.locale)
        .includes(search.toLocaleLowerCase(t.locale)),
  );
  function open(action: () => void) {
    setActionError("");
    action();
  }
  const save: Save = async (body) => {
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch("/api/contracts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        result = await response.json();
      if (!response.ok) {
        if (response.status === 409) await mutate();
        throw new Error(result.error);
      }
      await mutate();
      setEditing(null);
      setReturnOpen(false);
      setViewId(result.id);
      setNotice("Contract saved");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="agency-management">
      <PageIntro
        title="Contracts"
        text="Prepare rental agreements and keep the agreed vehicle, customer and return details together."
      >
        <button
          className="button"
          disabled={!management}
          onClick={() => open(() => setEditing("new"))}
        >
          <Plus size={16} aria-hidden="true" />
          {t("New contract")}
        </button>
      </PageIntro>
      {(error || managementError) && (
        <p className="error-note" role="alert">
          {t((error || managementError).message)}{" "}
          <button
            className="button ghost"
            onClick={() => {
              void mutate();
              void reloadManagement();
            }}
          >
            {t("Try again")}
          </button>
        </p>
      )}
      {isLoading && !contracts ? (
        <div className="skeleton card" role="status">
          <span className="sr-only">{t("Loading contracts")}</span>
        </div>
      ) : error && !contracts ? (
        <div className="card">
          <Empty
            title="Management records unavailable"
            description={t(error.message)}
          />
        </div>
      ) : (
        <>
          <div className="contract-metrics">
            {["draft", "issued", "returned"].map((s) => (
              <div className="card" key={s}>
                <strong>{records.filter((c) => c.status === s).length}</strong>
                <span>
                  {t(
                    s === "draft"
                      ? "Draft contracts"
                      : s === "issued"
                        ? "Issued contracts"
                        : "Returned rentals",
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="notice">
            {t(
              "Contracts record agreed rental details. Vehicle availability and fleet status are managed separately.",
            )}
          </div>
          {(contactId || vehicleId) && (
            <p>
              <Link href="/agency/contracts" className="text-link">
                {t("Show all contracts")}
              </Link>
            </p>
          )}
          <div className="management-toolbar card">
            <label>
              {t("Search contracts")}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Customer, vehicle, plate or contract number")}
              />
            </label>
            <Dropdown
              label={<>{t("Status")}</>}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">{t("All records")}</option>
              {["draft", "issued", "returned", "void"].map((s) => (
                <option key={s} value={s}>
                  {t(s.replace(/^./, (c) => c.toUpperCase()))}
                </option>
              ))}
            </Dropdown>
            <p className="sr-only" role="status" aria-live="polite">
              {t("{0} records shown", { "0": visible.length })}
            </p>
          </div>
          <div className="management-grid">
            {visible.map((c) => (
              <article className="card management-card" key={c.id}>
                <div className="row between">
                  <strong>{c.number || t("Draft contract")}</strong>
                  <Badge status={c.status} />
                </div>
                <h2>{c.customer.name}</h2>
                <p>
                  {c.vehicle.name} · <strong>{c.vehicle.plate}</strong>
                </p>
                <p className="muted">
                  {c.start} → {c.end}
                </p>
                <p className="invoice-amount">
                  {money(c.total, c.currency, t.locale)}
                </p>
                <p>
                  {t("Refundable deposit")}:{" "}
                  {money(c.deposit, c.currency, t.locale)}
                </p>
                <div className="row">
                  <button
                    className="button secondary"
                    onClick={() =>
                      open(() => {
                        setViewId(c.id);
                        setReturnOpen(false);
                      })
                    }
                  >
                    {t("View contract")}
                  </button>
                  {c.status === "draft" && (
                    <button
                      className="button ghost"
                      onClick={() => open(() => setEditing(c))}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      {t("Edit")}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="card">
              <Empty
                title="No contracts to show"
                description="Create a rental contract or adjust your search and filters."
              />
            </div>
          )}
        </>
      )}
      {editing && management && (
        <Modal
          title={editing === "new" ? "New contract" : "Edit contract"}
          onClose={() => !busy && setEditing(null)}
        >
          <ContractForm
            contract={editing === "new" ? undefined : editing}
            management={management}
            workspace={workspace}
            initialContactId={contactId}
            initialVehicleId={vehicleId}
            busy={busy}
            error={actionError}
            onSave={save}
          />
        </Modal>
      )}
      {view && !editing && (
        <Modal
          title="Contract details"
          onClose={() => !busy && setViewId(null)}
        >
          <ContractDocument contract={view} />
          <div className="stack management-no-print">
            {actionError && (
              <p className="error-note" role="alert">
                {t(actionError)}
              </p>
            )}
            <div className="row management-actions">
              <button
                className="button secondary"
                onClick={() => window.print()}
              >
                <Printer size={15} aria-hidden="true" />
                {t("Print / Save PDF")}
              </button>
              {view.status === "draft" && (
                <>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => open(() => setEditing(view))}
                  >
                    {t("Edit draft")}
                  </button>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      void save({
                        action: "issue",
                        id: view.id,
                        version: view.version,
                      })
                    }
                  >
                    {t("Issue contract")}
                  </button>
                </>
              )}
              {view.status === "issued" && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => setReturnOpen(!returnOpen)}
                >
                  {t("Record vehicle return")}
                </button>
              )}
            </div>
            {view.status === "draft" && (
              <p className="muted">
                {t(
                  "Review all details before issuing. Issuing assigns a contract number and locks the agreed rental details.",
                )}
              </p>
            )}
            <p className="muted">
              {t("Signature lines are for signing the printed document.")}
            </p>
            {returnOpen && (
              <ReturnForm
                key={view.version}
                contract={view}
                busy={busy}
                onSave={save}
              />
            )}
            {["draft", "issued"].includes(view.status) && (
              <details>
                <summary>{t("Void this contract")}</summary>
                <p>
                  {t(
                    "Voiding keeps the contract record. It cannot be issued again.",
                  )}
                </p>
                <button
                  className="button danger"
                  disabled={busy}
                  onClick={() =>
                    void save({
                      action: "void",
                      id: view.id,
                      version: view.version,
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

function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const t = useTranslations();
  return (
    <label>
      {t(label)}
      <input {...props} />
    </label>
  );
}
function FuelField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations();
  return (
    <Dropdown
      label={<>{t(label)}</>}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {fuelLevels.map((f) => (
        <option key={f} value={f}>
          {t(fuelLabels[f])}
        </option>
      ))}
    </Dropdown>
  );
}

function ContractForm({
  contract: c,
  management,
  workspace,
  initialContactId,
  initialVehicleId,
  busy,
  error,
  onSave,
}: {
  contract?: RentalContract;
  management: ManagementData;
  workspace: DashboardData;
  initialContactId: string;
  initialVehicleId: string;
  busy: boolean;
  error: string;
  onSave: Save;
}) {
  const t = useTranslations(),
    [id] = useState(() => c?.id || crypto.randomUUID());
  const [form, setForm] = useState({
    contactId: c?.contactId || initialContactId,
    vehicleId: c?.vehicleId || initialVehicleId,
    bookingId: c?.bookingId || "",
    invoiceId: c?.invoiceId || "",
    driverName: c?.driverName || "",
    driverLicence: c?.driverLicence || "",
    start: c?.start || "",
    end: c?.end || "",
    pickupTime: c?.pickupTime || "10:00",
    returnTime: c?.returnTime || "10:00",
    pickupLocation: c?.pickupLocation || "",
    returnLocation: c?.returnLocation || "",
    currency: c?.currency || "EUR",
    dailyRate: c ? (c.dailyRate / 100).toFixed(2) : "",
    deposit: c ? (c.deposit / 100).toFixed(2) : "0.00",
    mileageOut: c?.mileageOut || 0,
    fuelOut: c?.fuelOut || "full",
    conditionOut: c?.conditionOut || "",
    terms: c?.terms || "",
    notes: c?.notes || "",
  });
  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }
  let total: string = "—";
  try {
    const quote = contractQuote(
      form.start,
      form.end,
      Math.round(Number(form.dailyRate) * 100),
    );
    total = `${quote.days} × ${money(Math.round(Number(form.dailyRate) * 100), form.currency, t.locale)} = ${money(quote.total, form.currency, t.locale)}`;
  } catch {}
  return (
    <form
      className="stack"
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          ...form,
          action: "save",
          id,
          version: c?.version || 0,
          dailyRate: Math.round(Number(form.dailyRate) * 100),
          deposit: Math.round(Number(form.deposit) * 100),
        });
      }}
    >
      <Dropdown
        label={<>{t("Reservation (optional)")}</>}
        value={form.bookingId}
        onChange={(e) => {
          const b = workspace.bookings.find((b) => b.id === e.target.value);
          if (!b) {
            update("bookingId", "");
            return;
          }
          const customer = management.contacts.find(
              (c) =>
                c.status === "active" &&
                c.email &&
                c.email.toLowerCase() === b.email.toLowerCase(),
            ),
            cars = management.vehicles.filter(
              (v) => v.listingId === b.listingId,
            ),
            listing = workspace.listings.find((l) => l.id === b.listingId);
          setForm({
            ...form,
            bookingId: b.id,
            contactId: customer?.id || "",
            vehicleId: cars.length === 1 ? cars[0].id : "",
            invoiceId: "",
            driverName: b.name,
            start: b.start,
            end: b.end,
            pickupLocation: b.pickup,
            returnLocation: b.returnCity || b.city,
            currency: "EUR",
            dailyRate: listing
              ? (listing.price / 100).toFixed(2)
              : form.dailyRate,
            deposit: (b.deposit / 100).toFixed(2),
            mileageOut: cars.length === 1 ? cars[0].mileage : 0,
          });
        }}
      >
        <option value="">{t("Standalone contract")}</option>
        {workspace.bookings
          .filter((b) => b.category === "cars")
          .map((b) => (
            <option key={b.id} value={b.id}>
              {b.id} · {b.name}
            </option>
          ))}
      </Dropdown>
      <Dropdown
        label={<>{t("Customer")}</>}
        required
        value={form.contactId}
        onChange={(e) => {
          const customer = management.contacts.find(
            (c) => c.id === e.target.value,
          );
          setForm({
            ...form,
            contactId: e.target.value,
            driverName: customer?.name || form.driverName,
            invoiceId: "",
          });
        }}
      >
        <option value="">{t("Choose a contact")}</option>
        {management.contacts
          .filter((c) => c.status === "active")
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </Dropdown>
      <Dropdown
        label={<>{t("Vehicle")}</>}
        required
        value={form.vehicleId}
        onChange={(e) => {
          const v = management.vehicles.find((v) => v.id === e.target.value);
          setForm({
            ...form,
            vehicleId: e.target.value,
            mileageOut: v?.mileage || 0,
          });
        }}
      >
        <option value="">{t("Choose a vehicle")}</option>
        {management.vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.plate} · {v.name}
          </option>
        ))}
      </Dropdown>
      {(!management.contacts.some((c) => c.status === "active") ||
        !management.vehicles.length) && (
        <p className="notice">
          {t(
            "Add an active contact and a physical vehicle before creating a contract.",
          )}
        </p>
      )}
      <div className="field-grid">
        <Field
          label="Driver name"
          required
          minLength={2}
          maxLength={120}
          value={form.driverName}
          onChange={(e) => update("driverName", e.target.value)}
        />
        <Field
          label="Driving licence number"
          required
          minLength={2}
          maxLength={80}
          value={form.driverLicence}
          onChange={(e) => update("driverLicence", e.target.value)}
        />
      </div>
      <div className="field-grid">
        <Field
          label="Pickup date"
          required
          type="date"
          value={form.start}
          onChange={(e) => update("start", e.target.value)}
        />
        <Field
          label="Return date"
          required
          type="date"
          min={form.start}
          value={form.end}
          onChange={(e) => update("end", e.target.value)}
        />
      </div>
      <div className="field-grid">
        <Field
          label="Pickup time"
          required
          type="time"
          value={form.pickupTime}
          onChange={(e) => update("pickupTime", e.target.value)}
        />
        <Field
          label="Return time"
          required
          type="time"
          value={form.returnTime}
          onChange={(e) => update("returnTime", e.target.value)}
        />
      </div>
      <p className="muted">
        {t(
          "Times are in Morocco local time. Rental prices use calendar-day intervals.",
        )}
      </p>
      <Field
        label="Pickup location"
        required
        minLength={3}
        maxLength={300}
        value={form.pickupLocation}
        onChange={(e) => update("pickupLocation", e.target.value)}
      />
      <Field
        label="Return location"
        required
        minLength={3}
        maxLength={300}
        value={form.returnLocation}
        onChange={(e) => update("returnLocation", e.target.value)}
      />
      <Dropdown
        label={<>{t("Currency")}</>}
        value={form.currency}
        onChange={(e) =>
          setForm({
            ...form,
            currency: e.target.value as RentalContract["currency"],
            invoiceId: "",
          })
        }
      >
        <option value="EUR">EUR</option>
        <option value="MAD">MAD</option>
      </Dropdown>
      <div className="field-grid">
        <Field
          label="Daily rental rate"
          required
          type="number"
          min="0.01"
          max={1000000}
          step="0.01"
          value={form.dailyRate}
          onChange={(e) => update("dailyRate", e.target.value)}
        />
        <Field
          label="Refundable deposit"
          required
          type="number"
          min={0}
          max={1000000}
          step="0.01"
          value={form.deposit}
          onChange={(e) => update("deposit", e.target.value)}
        />
      </div>
      <p role="status" aria-live="polite">
        <strong>
          {t("Rental total")}: {total}
        </strong>
      </p>
      <Dropdown
        label={<>{t("Linked invoice (optional)")}</>}
        value={form.invoiceId}
        onChange={(e) => update("invoiceId", e.target.value)}
      >
        <option value="">{t("Not linked")}</option>
        {management.invoices
          .filter(
            (i) =>
              i.contactId === form.contactId &&
              i.currency === form.currency &&
              i.status !== "void",
          )
          .map((i) => (
            <option key={i.id} value={i.id}>
              {i.number || t("Draft invoice")} ·{" "}
              {money(i.total, i.currency, t.locale)}
            </option>
          ))}
      </Dropdown>
      <div className="field-grid">
        <Field
          label="Pickup mileage (km)"
          required
          type="number"
          min={0}
          max={5000000}
          value={form.mileageOut}
          onChange={(e) => update("mileageOut", +e.target.value)}
        />
        <FuelField
          label="Fuel at pickup"
          value={form.fuelOut}
          onChange={(value) => update("fuelOut", value)}
        />
      </div>
      <label>
        {t("Vehicle condition at pickup")}
        <textarea
          required
          minLength={3}
          maxLength={3000}
          value={form.conditionOut}
          onChange={(e) => update("conditionOut", e.target.value)}
        />
      </label>
      <label>
        {t("Agency rental terms")}
        <textarea
          required
          minLength={10}
          maxLength={10000}
          value={form.terms}
          onChange={(e) => update("terms", e.target.value)}
        />
      </label>
      <p className="muted">
        {t(
          "Enter your agency terms, including agreed cover, mileage limits, fees and return conditions.",
        )}
      </p>
      <label>
        {t("Contract notes")}
        <textarea
          maxLength={2000}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </label>
      {error && (
        <p className="error-note" role="alert">
          {t(error)}
        </p>
      )}
      <button className="button" disabled={busy}>
        {t(busy ? "Saving…" : "Save contract")}
      </button>
    </form>
  );
}

function ReturnForm({
  contract: c,
  busy,
  onSave,
}: {
  contract: RentalContract;
  busy: boolean;
  onSave: Save;
}) {
  const t = useTranslations();
  return (
    <form
      className="card stack contract-return"
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void onSave({
          action: "return",
          id: c.id,
          version: c.version,
          date: f.get("date"),
          mileage: Number(f.get("mileage")),
          fuel: f.get("fuel"),
          condition: f.get("condition"),
        });
      }}
    >
      <h3>{t("Record vehicle return")}</h3>
      <Field
        label="Actual return date"
        name="date"
        required
        type="date"
        min={c.start}
        max={today()}
        defaultValue={today()}
      />
      <Field
        label="Return mileage (km)"
        name="mileage"
        required
        type="number"
        min={c.mileageOut}
        max={5000000}
        defaultValue={c.mileageOut}
      />
      <Dropdown
        label={<>{t("Fuel at return")}</>}
        name="fuel"
        defaultValue={c.fuelOut}
      >
        {fuelLevels.map((f) => (
          <option key={f} value={f}>
            {t(fuelLabels[f])}
          </option>
        ))}
      </Dropdown>
      <label>
        {t("Vehicle condition at return")}
        <textarea name="condition" required minLength={3} maxLength={3000} />
      </label>
      <button className="button" disabled={busy}>
        {t("Save vehicle return")}
      </button>
    </form>
  );
}

function ContractDocument({ contract: c }: { contract: RentalContract }) {
  const t = useTranslations();
  return (
    <article className="invoice-document contract-document">
      <div className="invoice-document-head">
        <div>
          <span className="eyebrow">{t("Rental contract")}</span>
          <h2>{c.number || t("DRAFT — Not issued")}</h2>
          <Badge status={c.status} />
        </div>
        <div>
          <strong>{c.issuer.name}</strong>
          <p className="management-notes">
            {[c.issuer.address, c.issuer.email, c.issuer.phone]
              .filter(Boolean)
              .join("\n")}
          </p>
          {c.issuer.registration && (
            <p>
              {t("Registration")}: {c.issuer.registration}
            </p>
          )}
          {c.issuer.taxId && (
            <p>
              {t("Business tax identifier")}: {c.issuer.taxId}
            </p>
          )}
        </div>
      </div>
      <h3>{t("Customer and driver")}</h3>
      <p className="management-notes">
        {[
          c.customer.name,
          c.customer.company,
          c.customer.address,
          c.customer.email,
          c.customer.phone,
        ]
          .filter(Boolean)
          .join("\n")}
      </p>
      <p>
        {t("Driver name")}: {c.driverName}
        <br />
        {t("Driving licence number")}: {c.driverLicence}
      </p>
      <h3>{t("Vehicle and rental period")}</h3>
      <p>
        <strong>
          {c.vehicle.name} · {c.vehicle.plate}
        </strong>{" "}
        · {c.vehicle.year}
        <br />
        {t("Pickup")}: {c.start} {c.pickupTime} · {c.pickupLocation}
        <br />
        {t("Return")}: {c.end} {c.returnTime} · {c.returnLocation}
      </p>
      <p className="muted">
        {t(
          "Times are in Morocco local time. Rental prices use calendar-day intervals.",
        )}
      </p>
      {c.bookingId && (
        <p>
          {t("Reservation")}: {c.bookingId}
        </p>
      )}
      {c.invoiceId && (
        <p>
          {t("Linked invoice")}: {c.invoiceNumber || t("Draft invoice")}
        </p>
      )}
      <dl className="invoice-totals">
        <div>
          <dt>{t("Rental days")}</dt>
          <dd>{c.days}</dd>
        </div>
        <div>
          <dt>{t("Daily rental rate")}</dt>
          <dd>{money(c.dailyRate, c.currency, t.locale)}</dd>
        </div>
        <div>
          <dt>{t("Rental total")}</dt>
          <dd>{money(c.total, c.currency, t.locale)}</dd>
        </div>
        <div>
          <dt>{t("Refundable deposit")}</dt>
          <dd>{money(c.deposit, c.currency, t.locale)}</dd>
        </div>
      </dl>
      <p className="muted">
        {t(
          "The refundable deposit is separate from the rental total. This contract does not record a payment.",
        )}
      </p>
      <h3>{t("Vehicle condition at pickup")}</h3>
      <p>
        {t("Mileage")}: {c.mileageOut.toLocaleString(t.locale)} km ·{" "}
        {t(fuelLabels[c.fuelOut])}
      </p>
      <p className="management-notes">{c.conditionOut}</p>
      <h3>{t("Agency rental terms")}</h3>
      <p className="management-notes">{c.terms}</p>
      {c.notes && (
        <>
          <h3>{t("Contract notes")}</h3>
          <p className="management-notes">{c.notes}</p>
        </>
      )}
      <div className="contract-signatures">
        <p className="contract-signature-reference">
          {t("Reference")}: {c.number || t("Draft contract")}
        </p>
        {["Customer signature and date", "Agency signature and date"].map(
          (label) => (
            <div key={label}>
              <h3>{t(label)}</h3>
              <div className="signature-line" />
            </div>
          ),
        )}
      </div>
      {c.returned && (
        <section>
          <h3>{t("Vehicle return record")}</h3>
          <p>
            {c.returned.date} · {c.returned.mileage.toLocaleString(t.locale)} km
            · {t(fuelLabels[c.returned.fuel])}
          </p>
          <p className="management-notes">{c.returned.condition}</p>
        </section>
      )}
    </article>
  );
}
