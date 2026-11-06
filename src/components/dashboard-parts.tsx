"use client";
import Dropdown from "./dropdown";
import { useTranslations } from "@/i18n/provider";
import Link from "next/link";
import CarPhotoPicker from "./car-photo-picker";
import type { CarPhoto } from "@/lib/car-photos";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  CircleCheck,
  Mail,
  MapPin,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  DashboardData,
  Role,
  Booking,
  Listing,
  Agency,
  Status,
} from "@/lib/types";
import { money, dateLabel, today, cities, categories } from "@/lib/catalog";
import { Badge, Empty } from "./ui";
export function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
export function PageIntro({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations();
  return (
    <div className="page-intro">
      <div>
        <h1>{t(title)}</h1>
        <p>{t(text)}</p>
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}
export function Stat({
  label,
  value,
  icon: Icon,
  foot,
  trend,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  foot: string;
  trend: string;
}) {
  const t = useTranslations();
  return (
    <div className="card stat-card">
      <div className="row between">
        <span className="stat-label">{t(label)}</span>
        <div className="stat-icon">
          <Icon
            aria-hidden="true"
            focusable="false"
            size={17}
            strokeWidth={1.5}
          />
        </div>
      </div>
      <div className="stat-value">{t(value)}</div>
      <div className="stat-foot">
        <span className="up">
          <span className="stat-indicator" aria-hidden="true" />
          {t(trend)}
        </span>
      </div>
      <p className="stat-foot" style={{ marginTop: ".4rem" }}>
        {t(foot)}
      </p>
    </div>
  );
}
export function RevenueChart({
  bookings,
  period,
}: {
  bookings: Booking[];
  period: number;
}) {
  const t = useTranslations();
  const count = 12;
  const step = period / count;
  const now = new Date();
  const values = Array.from({ length: count }, (_, i) => {
    const from = new Date(now.getTime() - (count - i) * step * 86400000),
      to = new Date(now.getTime() - (count - i - 1) * step * 86400000);
    return {
      label: new Intl.DateTimeFormat(t.tag, {
        day: "numeric",
        month: "short",
      }).format(from),
      value: bookings
        .filter(
          (b) =>
            ["confirmed", "completed"].includes(b.status) &&
            new Date(b.createdAt) >= from &&
            new Date(b.createdAt) < to,
        )
        .reduce((sum, b) => sum + b.total, 0),
    };
  });
  const max = Math.max(10000, ...values.map((v) => v.value));
  const total = values.reduce((sum, v) => sum + v.value, 0);
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{t("Booking value over time")}</h2>
          <p className="chart-subtitle">
            {t("Confirmed and completed reservations")}
          </p>
        </div>
        <div className="chart-legend">
          <span>
            <i className="legend-dot" />
            {t("Booking value")}
          </span>
        </div>
      </div>
      <div className="chart-body">
        <div className="row between">
          <div>
            <span className="chart-total">{t(money(total, t.locale))}</span>
            <span className="chart-caption" style={{ marginLeft: ".6rem" }}>
              {t("last ")}
              {period}
              {t(" days")}
            </span>
          </div>
          <span className="badge active">{t("EUR")}</span>
        </div>
        <div
          className="bar-chart"
          role="img"
          aria-label={t(
            "Confirmed booking value of {0} over the last {1} days",
            { "0": money(total, t.locale), "1": period },
          )}
        >
          <div className="chart-scale">
            {[1, 0.75, 0.5, 0.25, 0].map((n) => (
              <span key={n}>{t(money(Math.round(max * n), t.locale))}</span>
            ))}
          </div>
          <div className="chart-plot">
            {values.map((v, i) => (
              <div
                tabIndex={0}
                className="chart-column"
                key={i}
                aria-label={t("{0}: {1}", {
                  "0": v.label,
                  "1": money(v.value, t.locale),
                })}
              >
                <div
                  className="chart-bar"
                  style={{ height: `${(v.value / max) * 95}%` }}
                />
                <span className="chart-tooltip">
                  {t(money(v.value, t.locale))}
                </span>
                {i % 2 === 0 && <small>{t(v.label)}</small>}
              </div>
            ))}
          </div>
        </div>
        <p className="chart-caption">
          {t(
            "Scheduled booking value, before commissions. This is not a payment or payout report.",
          )}
        </p>
      </div>
    </section>
  );
}
const chartColors = [
  "var(--color-brand)",
  "var(--color-chart)",
  "var(--color-lime)",
  "var(--color-terracotta)",
];
export function CategoryChart({ bookings }: { bookings: Booking[] }) {
  const t = useTranslations();
  const total = bookings.length;
  const series = categories.map((c, i) => {
    const count = bookings.filter((b) => b.category === c.id).length;
    const value = total ? (count / total) * 100 : 0;
    const previousIds: string[] = categories
      .slice(0, i)
      .map((category) => category.id);
    const offset = total
      ? (bookings.filter((b) => previousIds.includes(b.category)).length /
          total) *
        100
      : 0;
    return { ...c, count, value, offset, color: chartColors[i] };
  });
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{t("Journeys by category")}</h2>
          <p className="chart-subtitle">
            {t("Every way to experience Morocco")}
          </p>
        </div>
        <ArrowUpRight
          aria-hidden="true"
          focusable="false"
          size={16}
          className="muted"
        />
      </div>
      <div className="ring-wrap">
        <div className="donut">
          <svg
            viewBox="0 0 42 42"
            role="img"
            aria-label={series
              .map((s) => t("{0}: {1}", { "0": t(s.label), "1": s.count }))
              .join(t.locale === "ar" ? "، " : ", ")}
          >
            <circle
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="5"
            />
            {series
              .filter((s) => s.count)
              .map((s) => (
                <circle
                  key={s.id}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="5"
                  strokeDasharray={`${Math.max(0, s.value - 1)} ${101 - s.value}`}
                  strokeDashoffset={-s.offset}
                />
              ))}
          </svg>
          <div className="donut-center">
            <strong>{total}</strong>
            <small>{t("reservations")}</small>
          </div>
        </div>
      </div>
      <div className="donut-legend">
        {series.map((s) => (
          <div key={s.id} className="row">
            <span className="color-dot" style={{ background: s.color }} />
            <span>{t(s.label)}</span>
            <strong>
              {Math.round(s.value)}
              {t("%")}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
export function BookingTable({
  bookings,
  onSelect,
  compact = false,
}: {
  bookings: Booking[];
  onSelect: (b: Booking) => void;
  compact?: boolean;
}) {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(bookings.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = compact
    ? bookings
    : bookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  if (!bookings.length)
    return (
      <Empty
        title={t("No reservations to show")}
        description={t(
          "New requests will appear here. Try adjusting your search or filters.",
        )}
      />
    );
  return (
    <>
      <div
        className="table-scroll reservation-desktop"
        tabIndex={0}
        role="region"
        aria-label={t("Reservations table")}
      >
        <table className="data-table">
          <caption className="sr-only">{t("Reservation list")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("Traveler")}</th>
              <th scope="col">{t("Experience")}</th>
              <th scope="col">{t("Trip dates")}</th>
              {!compact && <th scope="col">{t("City")}</th>}
              <th scope="col">{t("Status")}</th>
              <th scope="col">{t("Amount")}</th>
              <th scope="col">
                <span className="sr-only">{t("View details")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>
                  <div className="guest-cell">
                    <div className="avatar">{t(initials(b.name))}</div>
                    <div>
                      <strong>{b.name}</strong>
                      <small>{b.id}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <strong style={{ fontWeight: 500 }}>
                    {t(b.listingName)}
                  </strong>
                  <div className="ref">
                    {t(
                      categories.find((c) => c.id === b.category)?.label || "",
                    )}
                  </div>
                </td>
                <td>
                  {t(dateLabel(b.start, t.locale))}
                  {t(" \u2013 ")}
                  {t(dateLabel(b.end, t.locale))}
                </td>
                {!compact && <td>{t(b.city)}</td>}
                <td>
                  <Badge status={b.status} />
                </td>
                <td style={{ fontWeight: 600 }}>
                  {t(money(b.total, t.locale))}
                </td>
                <td>
                  <button
                    className="button ghost"
                    onClick={() => onSelect(b)}
                    aria-label={t("View reservation {0}", { "0": b.id })}
                  >
                    <ArrowUpRight
                      aria-hidden="true"
                      focusable="false"
                      size={16}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="reservation-mobile">
        {rows.map((b) => (
          <button
            key={b.id}
            className="reservation-mobile-card"
            onClick={() => onSelect(b)}
          >
            <span className="sr-only">
              {t("View reservation {0}", { "0": b.id })}
            </span>
            <span className="row between">
              <span className="guest-cell">
                <span className="avatar">{t(initials(b.name))}</span>
                <span>
                  <strong>{b.name}</strong>
                  <small>{b.id}</small>
                </span>
              </span>
              <Badge status={b.status} />
            </span>
            <span className="row between" style={{ marginTop: ".8rem" }}>
              <span>
                <strong>{t(b.listingName)}</strong>
                <small>
                  {t(dateLabel(b.start, t.locale))}
                  {t(" \u2013 ")}
                  {t(dateLabel(b.end, t.locale))}
                  {t(" \u00B7 ")}
                  {t(b.city)}
                </small>
              </span>
              <span className="row">
                <strong>{t(money(b.total, t.locale))}</strong>
                <ArrowUpRight aria-hidden="true" focusable="false" size={15} />
              </span>
            </span>
          </button>
        ))}
      </div>
      {!compact && (
        <nav
          className="reservation-pagination"
          aria-label={t("Reservation pages")}
        >
          <p role="status">
            {t("Showing {0}–{1} of {2} reservations", {
              "0": (currentPage - 1) * pageSize + 1,
              "1": Math.min(currentPage * pageSize, bookings.length),
              "2": bookings.length,
            })}
          </p>
          <div className="row">
            <button
              className="button secondary"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label={t("Previous page")}
            >
              <ChevronLeft aria-hidden="true" focusable="false" size={16} />
            </button>
            <span>
              {t("Page {0} of {1}", { "0": currentPage, "1": pageCount })}
            </span>
            <button
              className="button secondary"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
              aria-label={t("Next page")}
            >
              <ChevronRight aria-hidden="true" focusable="false" size={16} />
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
export function BookingDetails({
  booking: b,
  busy,
  error,
  onStatus,
}: {
  booking: Booking;
  busy: boolean;
  error: string;
  onStatus: (s: Status) => void;
}) {
  const t = useTranslations();
  return (
    <>
      <div className="row between">
        <div>
          <div className="eyebrow">{b.id}</div>
          <h3 style={{ marginTop: ".4rem" }}>{t(b.listingName)}</h3>
        </div>
        <Badge status={b.status} />
      </div>
      <dl className="detail-grid">
        {[
          ["Traveler", b.name],
          ["Contact", b.email],
          ["Phone", b.phone],
          [
            "Trip dates",
            `${dateLabel(b.start, t.locale)} – ${dateLabel(b.end, t.locale)}`,
          ],
          ["Pickup location", b.pickup],
          ["Return city", t(b.returnCity)],
          [
            "Protection",
            t(
              (
                {
                  essential: "Essential",
                  comfort: "Comfort",
                  plus: "Plus",
                  own: "My own cover",
                } as Record<string, string>
              )[b.protection] || b.protection,
            ),
          ],
          ["Guests", String(b.guests)],
          ["Reservation value", money(b.total, t.locale)],
          ["Security deposit", money(b.deposit, t.locale)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{t(k)}</dt>
            <dd>
              <bdi dir="auto">{v}</bdi>
            </dd>
          </div>
        ))}
      </dl>
      {b.notes && (
        <div className="notice" style={{ marginBottom: "1rem" }}>
          <strong>{t("Traveler notes")}</strong>
          <p style={{ whiteSpace: "pre-wrap", marginTop: ".4rem" }}>
            {b.notes}
          </p>
        </div>
      )}
      {b.status === "requested" && (
        <div className="notice" style={{ marginBottom: "1rem" }}>
          {t(
            "Review supplier availability and the quoted conditions before approving. Approval moves this request to awaiting payment. It does not confirm the trip or collect money.",
          )}
        </div>
      )}
      {b.status === "awaiting_payment" && (
        <div className="notice" style={{ marginBottom: "1rem" }}>
          {t(
            "Payment collection is not connected. This reservation remains unconfirmed until a payment provider and inventory allocation are configured.",
          )}
        </div>
      )}
      {error && (
        <div
          className="error-note"
          role="alert"
          style={{ marginBottom: "1rem" }}
        >
          {t(error)}
        </div>
      )}
      <div className="dialog-actions">
        <a
          className="button secondary"
          href={`mailto:${b.email}?subject=${encodeURIComponent(t("Your Atlas reservation {0}", { "0": b.id }))}`}
        >
          <Mail aria-hidden="true" focusable="false" size={14} />
          {t("Contact traveler")}
        </a>
        {b.status === "requested" && (
          <>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => onStatus("declined")}
            >
              {t("Decline request")}
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => onStatus("awaiting_payment")}
            >
              {t("Approve availability")}
              <CircleCheck aria-hidden="true" focusable="false" size={14} />
            </button>
          </>
        )}
        {b.status === "confirmed" && (
          <button
            className="button"
            disabled={busy}
            onClick={() => onStatus("completed")}
          >
            {t("Mark completed")}
          </button>
        )}
        {["requested", "awaiting_payment", "confirmed"].includes(b.status) && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => onStatus("cancelled")}
          >
            {t("Cancel reservation")}
          </button>
        )}
      </div>
    </>
  );
}
export function AgencyCard({
  agency: a,
  listings,
  bookings,
  busy,
  onStatus,
  onAccess,
}: {
  agency: Agency;
  listings: Listing[];
  bookings: Booking[];
  busy: boolean;
  onStatus: (s: string) => void;
  onAccess: () => void;
}) {
  const t = useTranslations();
  return (
    <section className="card agency-card">
      <div className="row between wrap">
        <div className="agency-logo">{initials(a.name)}</div>
        <Badge status={a.status} />
      </div>
      <h2>{a.name}</h2>
      <p>
        <MapPin
          aria-hidden="true"
          focusable="false"
          size={12}
          style={{ display: "inline" }}
        />{" "}
        {t(a.city)}
        {t(", Morocco")}
      </p>
      <p>
        <bdi>{a.email}</bdi>
      </p>
      {a.status === "pending" && (
        <div className="agency-review-note">
          <ShieldCheck aria-hidden="true" focusable="false" size={15} />
          {t(
            a.document
              ? "Registration document ready for review"
              : "Business details awaiting verification",
          )}
        </div>
      )}
      {a.registration && (
        <details className="application-review">
          <summary>{t("Review application details")}</summary>
          <dl>
            <div>
              <dt>{t("Owner’s full name")}</dt>
              <dd>{a.owner}</dd>
            </div>
            <div>
              <dt>{t("Phone number")}</dt>
              <dd dir="ltr">{a.phone}</dd>
            </div>
            <div>
              <dt>{t("WhatsApp number")}</dt>
              <dd dir="ltr">{a.whatsapp}</dd>
            </div>
            <div>
              <dt>{t("Your specialty")}</dt>
              <dd>
                {t(categories.find((c) => c.id === a.category)?.label || "")}
              </dd>
            </div>
            <div>
              <dt>{t("Commercial registration number")}</dt>
              <dd>{a.registration}</dd>
            </div>
            <div>
              <dt>{t("Fleet or service capacity")}</dt>
              <dd>{a.fleetSize}</dd>
            </div>
          </dl>
          <p>{a.description}</p>
          {a.document && (
            <a href={`/api/partners/${a.id}/document`} className="text-link">
              {t("Download registration document")}
              <ArrowUpRight aria-hidden="true" focusable="false" size={14} />
            </a>
          )}
        </details>
      )}
      <div className="agency-stats">
        <div>
          <strong>{listings.filter((l) => l.agencyId === a.id).length}</strong>
          <small>{t("Listings")}</small>
        </div>
        <div>
          <strong>{bookings.filter((b) => b.agencyId === a.id).length}</strong>
          <small>{t("Reservations")}</small>
        </div>
        <div>
          <strong>
            {a.commission}
            {t("%")}
          </strong>
          <small>{t("Commission")}</small>
        </div>
      </div>
      <div className="row between">
        <small className="muted">
          {t("Joined ")}
          {t(dateLabel(a.joined, t.locale))}
        </small>
        <button
          className={`button ${a.status === "active" ? "secondary" : ""}`}
          disabled={busy}
          onClick={() =>
            onStatus(a.status === "active" ? "suspended" : "active")
          }
        >
          {a.status === "pending"
            ? t("Approve agency")
            : a.status === "suspended"
              ? t("Reactivate")
              : t("Suspend")}
        </button>
      </div>
      {a.status === "active" && (
        <button
          className="text-link"
          onClick={onAccess}
          style={{ marginTop: "1rem" }}
        >
          {t("Create manager access")}
          <ArrowUpRight aria-hidden="true" focusable="false" size={14} />
        </button>
      )}
    </section>
  );
}
export function AccessForm({
  agency,
  busy,
  error,
  onSave,
}: {
  agency: Agency;
  busy: boolean;
  error: string;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  return (
    <form
      aria-busy={busy}
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(Object.fromEntries(new FormData(event.currentTarget)));
      }}
    >
      <p className="notice">
        {t(
          "Create an agency manager account after reviewing the business. Credentials are not sent automatically; coordinate a secure handoff with the agency.",
        )}
      </p>
      <label>
        {t("Manager name")}
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          autoComplete="off"
        />
      </label>
      <label>
        {t("Manager email")}
        <input
          name="email"
          type="email"
          defaultValue={agency.email}
          required
          autoComplete="off"
        />
      </label>
      <label>
        {t("Initial password")}
        <input
          name="password"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
        <small className="muted">
          {t("Use at least 12 characters. Store the password before saving.")}
        </small>
      </label>
      {error && (
        <p className="error-note" role="alert">
          {t(error)}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? t("Creating access…") : t("Create agency manager")}
        <ArrowRight aria-hidden="true" focusable="false" size={15} />
      </button>
    </form>
  );
}
export function ListingEditor({
  listing,
  agencies,
  role,
  busy,
  error,
  onSave,
}: {
  listing?: Listing;
  agencies: Agency[];
  role: Role;
  busy: boolean;
  error: string;
  onSave: (b: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  const [photos, setPhotos] = useState<CarPhoto[]>(listing?.photos || []);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    id: listing?.id,
    name: listing?.name || "",
    category: listing?.category || "cars",
    city: listing?.city || "Marrakech",
    price: String((listing?.price || 3200) / 100),
    seats: listing?.seats || 5,
    transmission: listing?.transmission || "Manual",
    fuel: listing?.fuel || "Petrol",
    description: listing?.description || "",
    status: listing?.status || "published",
    agencyId: listing?.agencyId || agencies[0]?.id || "",
  });
  return (
    <form
      aria-busy={busy}
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (uploading) return;
        onSave({ ...form, photos, price: Math.round(+form.price * 100) });
      }}
    >
      <label>
        {t("Listing name")}
        <input
          required
          minLength={3}
          maxLength={80}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t("A name worth exploring")}
        />
      </label>
      <div className="field-grid">
        <Dropdown
          label={<>{t("Category")}</>}
          value={form.category}
          disabled={busy || uploading}
          onChange={(e) => {
            setForm({
              ...form,
              category: e.target.value as Listing["category"],
            });
            setPhotos([]);
          }}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {t(c.label)}
            </option>
          ))}
        </Dropdown>
        <Dropdown
          label={<>{t("City")}</>}
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {t(c)}
            </option>
          ))}
        </Dropdown>
        <label>
          {t("Price in EUR")}
          <input
            required
            type="number"
            min="5"
            max="10000"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </label>
        <label>
          {t("Maximum guests")}
          <input
            required
            type="number"
            min="1"
            max="20"
            value={form.seats}
            onChange={(e) => setForm({ ...form, seats: +e.target.value })}
          />
        </label>
        <label>
          {form.category === "cars"
            ? t("Transmission")
            : t("Duration / service type")}
          <input
            required
            maxLength={40}
            value={form.transmission}
            onChange={(e) => setForm({ ...form, transmission: e.target.value })}
          />
        </label>
        <label>
          {form.category === "cars" ? t("Fuel type") : t("Included service")}
          <input
            required
            maxLength={40}
            value={form.fuel}
            onChange={(e) => setForm({ ...form, fuel: e.target.value })}
          />
        </label>
      </div>
      {role === "platform" && (
        <Dropdown
          label={<>{t("Provider agency")}</>}
          required
          value={form.agencyId}
          disabled={busy || uploading}
          onChange={(e) => {
            setForm({ ...form, agencyId: e.target.value });
            setPhotos([]);
          }}
        >
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Dropdown>
      )}
      {form.category === "cars" && (
        <CarPhotoPicker
          key={form.agencyId}
          photos={photos}
          onChange={setPhotos}
          agencyId={form.agencyId}
          disabled={busy}
          onBusyChange={setUploading}
        />
      )}
      <label>
        {t("Description")}
        <textarea
          required
          minLength={20}
          maxLength={2000}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={t("What makes this listing a good fit for a traveler?")}
        />
      </label>
      <Dropdown
        label={<>{t("Visibility")}</>}
        aria-label={t("Visibility")}
        value={form.status}
        onChange={(e) =>
          setForm({ ...form, status: e.target.value as Listing["status"] })
        }
      >
        <option value="published">{t("Published")}</option>
        <option value="archived">
          {t("Archived \u00B7 hidden from travelers")}
        </option>
      </Dropdown>
      {form.category === "cars" && (
        <p className="notice">
          {t(
            "Uploaded listing photos are visible to travelers when published. Without photos, an illustrative image is used.",
          )}
        </p>
      )}
      {error && (
        <div className="error-note" role="alert">
          {t(error)}
        </div>
      )}
      <button className="button" disabled={busy || uploading}>
        {busy ? t("Saving…") : t("Save listing")}
        <ArrowRight aria-hidden="true" focusable="false" size={15} />
      </button>
    </form>
  );
}
export function Settings({
  data,
  busy,
  error,
  onSave,
}: {
  data: DashboardData;
  busy: boolean;
  error: string;
  onSave: (b: Record<string, unknown>) => Promise<boolean>;
}) {
  const t = useTranslations();
  const agency = data.agencies.find((a) => a.id === data.session.agencyId);
  const [name, setName] = useState(data.session.name),
    [agencyName, setAgencyName] = useState(agency?.name || ""),
    [billingAddress, setBillingAddress] = useState(
      agency?.billingAddress || "",
    ),
    [taxId, setTaxId] = useState(agency?.taxId || ""),
    [city, setCity] = useState(agency?.city || "Marrakech");
  return (
    <div className="settings-grid">
      <form
        aria-busy={busy}
        className="card form-card stack"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave({
            name,
            ...(agency ? { agencyName, city, billingAddress, taxId } : {}),
          });
        }}
      >
        <h2>{t("Your workspace details")}</h2>
        <p>{t("A few details that help us keep things personal.")}</p>
        <label>
          {t("Your name")}
          <input
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          {t("Email")}
          <input value={data.session.email} disabled />
          <small className="muted">
            {t("Contact your administrator to change sign-in credentials.")}
          </small>
        </label>
        {agency && (
          <>
            <label>
              {t("Business name")}
              <input
                required
                minLength={2}
                maxLength={100}
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
              />
            </label>
            <Dropdown
              label={<>{t("Primary city")}</>}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {t(c)}
                </option>
              ))}
            </Dropdown>
            <label>
              {t("Business billing address")}
              <textarea
                maxLength={500}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
              />
            </label>
            <label>
              {t("Business tax identifier")}
              <input
                maxLength={100}
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </label>
          </>
        )}
        {error && (
          <p className="error-note" role="alert">
            {t(error)}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? t("Saving…") : t("Save changes")}
        </button>
      </form>
      <div className="stack" style={{ alignContent: "start" }}>
        <div className="card form-card">
          <div className="row">
            <ShieldCheck
              aria-hidden="true"
              focusable="false"
              size={19}
              className="muted"
            />
            <h2>{t("Workspace access")}</h2>
          </div>
          <p style={{ marginTop: ".8rem" }}>
            {t("Your role determines the records and actions you can access.")}
          </p>
          <dl className="detail-grid">
            <div>
              <dt>{t("Role")}</dt>
              <dd>
                {data.session.role === "agency"
                  ? t("Agency manager")
                  : t("Platform administrator")}
              </dd>
            </div>
            <div>
              <dt>{t("Session")}</dt>
              <dd>{t("Secure \u00B7 24-hour expiry")}</dd>
            </div>
          </dl>
          <Link href="/policies/privacy" className="text-link">
            {t("Privacy & data")}
            <ArrowUpRight aria-hidden="true" focusable="false" size={14} />
          </Link>
        </div>
        <div className="notice">
          <strong>{t("Financial operations")}</strong>
          <p style={{ marginTop: ".4rem" }}>
            {t(
              "Dashboard values show reservation activity. Payment collection, refunds, email delivery, and agency payouts need provider setup before launch.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
export function Calendar({
  bookings,
  onSelect,
}: {
  bookings: Booking[];
  onSelect: (b: Booking) => void;
}) {
  const t = useTranslations();
  const [date, setDate] = useState(() => new Date());
  const year = date.getUTCFullYear(),
    month = date.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first);
  start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
  function change(n: number) {
    setDate(new Date(Date.UTC(year, month + n, 1)));
  }
  return (
    <section className="card" style={{ padding: "1rem" }}>
      <div className="row between" style={{ marginBottom: "1rem" }}>
        <h2>
          {t(
            new Intl.DateTimeFormat(t.tag, {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(date),
          )}
        </h2>
        <div className="row">
          <button
            className="button secondary"
            onClick={() => setDate(new Date())}
          >
            {t("Today")}
          </button>
          <button
            className="icon-button"
            onClick={() => change(-1)}
            aria-label={t("Previous month")}
          >
            <ChevronLeft aria-hidden="true" focusable="false" size={16} />
          </button>
          <button
            className="icon-button"
            onClick={() => change(1)}
            aria-label={t("Next month")}
          >
            <ChevronRight aria-hidden="true" focusable="false" size={16} />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div className="calendar-weekday" key={d}>
            {t(d)}
          </div>
        ))}
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          return (
            <div
              key={key}
              className={`calendar-day ${d.getUTCMonth() !== month ? "outside" : ""} ${key === today() ? "today" : ""}`}
            >
              <strong>{d.getUTCDate()}</strong>
              {bookings
                .filter(
                  (b) =>
                    b.start === key &&
                    !["cancelled", "declined"].includes(b.status),
                )
                .map((b) => (
                  <button
                    key={b.id}
                    className="calendar-event"
                    onClick={() => onSelect(b)}
                    title={t("{0} \u00B7 {1}", {
                      "0": b.name,
                      "1": t(b.listingName),
                    })}
                  >
                    {t(b.listingName)}
                    <br />
                    {b.name}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
      <p className="chart-caption" style={{ marginTop: ".75rem" }}>
        {t(
          "Start dates of active reservation requests and trips. All dates follow the Morocco travel calendar.",
        )}
      </p>
    </section>
  );
}
