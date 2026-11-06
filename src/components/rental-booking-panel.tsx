"use client";
import { useSiteDate } from "./site-date";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { customerClient } from "@/lib/customer-client";
import { fetchJson } from "@/lib/client";
import { mad, rentalInstant } from "@/lib/kracar/time";
import { contractualVersion } from "@/lib/kracar/terms";
import type { RentalQuote } from "@/lib/kracar/pricing";
import type { RentalCar } from "./kracar-marketplace";
import RentalDateTimeField from "./rental-date-time-field";
import {
  defaultRentalDateTime,
  keepReturnAfterPickup,
  nextRentalMinute,
} from "@/lib/rental-calendar";

const futureDay = defaultRentalDateTime;
function readExtras(value: string | null): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, count]) =>
          Number.isInteger(count) && Number(count) >= 0 && Number(count) <= 10,
      ),
    );
  } catch {
    return {};
  }
}

export default function RentalBookingPanel({ car }: { car: RentalCar }) {
  const t = useTranslations(),
    params = useSearchParams(),
    router = useRouter();
  const today = useSiteDate();
  const { mutate: updateCache } = useSWRConfig();
  const { data: session, isPending } = customerClient.useSession();
  const [step, setStep] = useState(params.get("step") === "details" ? 2 : 1);
  const [start, setStart] = useState(
    params.get("start") || futureDay(1, today),
  );
  const [end, setEnd] = useState(params.get("end") || futureDay(4, today));
  const [extras, setExtras] = useState(() => readExtras(params.get("extras")));
  const [details, setDetails] = useState<Record<string, string>>({});
  const [otherDriver, setOtherDriver] = useState(false),
    [businessInvoice, setBusinessInvoice] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reference, setReference] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const heading = useRef<HTMLHeadingElement>(null);
  let quoteKey: string | null = null;
  try {
    const pickup = rentalInstant(start),
      dropoff = rentalInstant(end);
    if (new Date(dropoff) > new Date(pickup))
      quoteKey = `/api/rental-cars?${new URLSearchParams({ id: car.id, quote: "1", start: pickup, end: dropoff, extras: JSON.stringify(extras) })}`;
  } catch {}
  const {
    data: quote,
    error: quoteError,
    mutate,
  } = useSWR<RentalQuote>(quoteKey, fetchJson);
  const returnTo = `/cars/${encodeURIComponent(car.id)}?${new URLSearchParams({ start, end, extras: JSON.stringify(extras), step: "details" })}`;
  const signInHref = `/account?next=${encodeURIComponent(returnTo)}`;
  const value = (key: string) =>
    details[key] ??
    (key === "name"
      ? session?.user.name || ""
      : key === "email"
        ? session?.user.email || ""
        : "");
  const dateLabel = (value: string) => {
    try {
      return new Intl.DateTimeFormat(t.tag, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Casablanca",
      }).format(new Date(rentalInstant(value)));
    } catch {
      return value;
    }
  };
  function move(next: number) {
    setStep(next);
    setError("");
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || busy) return;
    if (!session) {
      router.push(signInHref);
      return;
    }
    if (step < 3) {
      move(step + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "booking.create",
          vehicleId: car.id,
          start: rentalInstant(start),
          end: rentalInstant(end),
          customer: {
            name: value("name"),
            email: value("email"),
            phone: value("phone"),
            address: value("address"),
            licence: value("licence"),
            driverName: otherDriver ? value("driverName") : "",
            billingName: businessInvoice ? value("billingName") : "",
            ICE: businessInvoice ? value("ICE") : "",
          },
          pickup: value("pickup"),
          dropoff: value("dropoff"),
          source: "marketplace",
          extras,
          idempotencyKey,
          quotedTotal: quote.total,
          acceptedTerms:
            new FormData(event.currentTarget).get("acceptedTerms") === "on",
          termsVersion: contractualVersion(car.agency.terms, car.conditions),
        }),
      });
      if (response.status === 401) {
        setError(
          "Your session has expired. Sign in again to send your request.",
        );
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReference(result.reference);
      requestAnimationFrame(() => heading.current?.focus());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function field(key: string, label: string, type = "text", required = true) {
    return (
      <label key={key}>
        {t(label)}
        <input
          name={key}
          type={type}
          required={required}
          maxLength={key === "ICE" ? 30 : 300}
          value={value(key)}
          autoComplete={
            key === "name"
              ? "name"
              : key === "email"
                ? "email"
                : key === "phone"
                  ? "tel"
                  : key === "address"
                    ? "street-address"
                    : "off"
          }
          onChange={(event) =>
            setDetails((current) => ({ ...current, [key]: event.target.value }))
          }
        />
      </label>
    );
  }
  if (reference)
    return (
      <aside className="card kc-booking kc-request-success">
        <span className="kc-success-icon">
          <Check aria-hidden="true" />
        </span>
        <h2 ref={heading} tabIndex={-1}>
          {t("Your request has been sent")}
        </h2>
        <p>
          {t("Booking reference")}: <strong>{reference}</strong>
        </p>
        <p>
          {t(
            "The partner will review availability. Your booking is not confirmed yet, and no payment has been taken.",
          )}
        </p>
        <ol className="kc-next-steps">
          <li>{t("Follow the partner’s reply in My bookings.")}</li>
          <li>
            {t(
              "After approval, check the payment instructions for your advance and platform fee.",
            )}
          </li>
          <li>
            {t(
              "Keep your booking, contract and payment documents in the same place.",
            )}
          </li>
        </ol>
        <Link className="button" href="/account?tab=bookings">
          {t("Track my request")}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link
          className="text-link"
          href={`/support?reference=${encodeURIComponent(reference)}`}
        >
          {t("Ask about this booking")}
        </Link>
      </aside>
    );
  return (
    <aside className="card kc-booking" id="rental-request">
      <ol
        className="kc-booking-progress"
        aria-label={t("Rental request steps")}
      >
        {["Dates and options", "Your details", "Review and send"].map(
          (label, index) => (
            <li
              key={label}
              aria-current={step === index + 1 ? "step" : undefined}
            >
              <button
                type="button"
                disabled={index + 1 > step || busy}
                onClick={() => move(index + 1)}
              >
                <span>
                  {index + 1 < step ? (
                    <Check size={12} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                {t(label)}
              </button>
            </li>
          ),
        )}
      </ol>
      <div>
        <span className="eyebrow">{t("Step {0} of 3", { "0": step })}</span>
        <h2 ref={heading} tabIndex={-1}>
          {t(
            step === 1
              ? "Choose your dates and options"
              : step === 2
                ? "Who is travelling?"
                : "Check your request before sending",
          )}
        </h2>
        <p className="muted">
          {t(
            step === 1
              ? "Check the price first. You will review everything before sending a request."
              : step === 2
                ? "The partner needs these details to prepare your rental."
                : "Sending a request does not charge you or confirm the vehicle.",
          )}
        </p>
      </div>
      <form className="stack" onSubmit={submit} aria-busy={busy}>
        {step === 1 && (
          <>
            <div className="field-grid">
              <RentalDateTimeField
                label="Pickup date and time"
                value={start}
                onChange={(next) => {
                  setStart(next);
                  setEnd((current) => keepReturnAfterPickup(next, current));
                }}
              />
              <RentalDateTimeField
                label="Return date and time"
                value={end}
                min={nextRentalMinute(start)}
                rangeStart={start}
                onChange={setEnd}
              />
            </div>
            <p className="kc-field-help">
              {t("All pickup and return times are local to Morocco.")}
            </p>
            {car.extras.length > 0 && (
              <details className="kc-optional-fields">
                <summary>{t("Add optional extras")}</summary>
                <div className="stack">
                  {car.extras.map((extra) => (
                    <label key={extra.id}>
                      {extra.name} · {mad(extra.price, t.tag)}{" "}
                      {t(extra.perDay ? "per day" : "per rental")}
                      <input
                        type="number"
                        min={0}
                        max={extra.max}
                        value={extras[extra.id] || 0}
                        onChange={(event) =>
                          setExtras((current) => ({
                            ...current,
                            [extra.id]: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
        {step === 2 && session && (
          <>
            <fieldset className="kc-details-group">
              <legend>{t("Booking client")}</legend>
              {field("name", "Full name")}
              {field("email", "Email address", "email")}
              {field("phone", "Phone number", "tel")}
              {field("address", "Billing address")}
              {field("licence", "Driving licence number")}
            </fieldset>
            <fieldset className="kc-details-group">
              <legend>{t("Pickup and return")}</legend>
              {field("pickup", "Pickup location")}
              {field("dropoff", "Return location")}
            </fieldset>
            <label className="kc-compare-check">
              <input
                type="checkbox"
                checked={otherDriver}
                onChange={(event) => setOtherDriver(event.target.checked)}
              />
              {t("Someone else will drive")}
            </label>
            {otherDriver && field("driverName", "Driver name (if different)")}
            <label className="kc-compare-check">
              <input
                type="checkbox"
                checked={businessInvoice}
                onChange={(event) => setBusinessInvoice(event.target.checked)}
              />
              {t("I need an invoice for a company or another person")}
            </label>
            {businessInvoice && (
              <>
                {field("billingName", "Invoice recipient")}
                {field("ICE", "Client ICE (if applicable)", "text", false)}
              </>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <div className="kc-review-summary">
              <h3>{car.name}</h3>
              <p>
                {t("Provided by")} <strong>{car.agency.name}</strong>
              </p>
              <dl>
                <div>
                  <dt>{t("Pickup")}</dt>
                  <dd>
                    {dateLabel(start)}
                    <br />
                    {value("pickup")}
                  </dd>
                </div>
                <div>
                  <dt>{t("Return")}</dt>
                  <dd>
                    {dateLabel(end)}
                    <br />
                    {value("dropoff")}
                  </dd>
                </div>
                <div>
                  <dt>{t("Booking client")}</dt>
                  <dd>
                    {value("name")}
                    <br />
                    {value("email")}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                className="text-link"
                onClick={() => move(2)}
              >
                {t("Edit my details")}
              </button>
            </div>
          </>
        )}
        {!quoteKey ? (
          <p className="error-note" role="alert">
            {t("Return date must be after pickup.")}
          </p>
        ) : quoteError ? (
          <div role="alert">
            <p>
              {t(
                "We cannot calculate this price right now. Try again before continuing.",
              )}
            </p>
            <button
              type="button"
              className="button secondary"
              onClick={() => void mutate()}
            >
              {t("Try again")}
            </button>
          </div>
        ) : !quote ? (
          <p role="status">{t("Calculating your quote…")}</p>
        ) : (
          <div className="kc-payment-summary" aria-live="polite">
            <div className="kc-trip-total">
              <span>{t("Total including service fee")}</span>
              <strong>{mad(quote.total, t.tag)}</strong>
              <small>
                {quote.days === 1
                  ? t("1 rental day")
                  : t("{0} rental days", { "0": quote.days })}{" "}
                · {t("Platform service fee — 5%")}{" "}
                {mad(quote.serviceFee, t.tag)}
              </small>
            </div>
            <dl>
              <div className="kc-amount-due">
                <dt>{t("After partner approval")}</dt>
                <dd>
                  {mad(quote.prepayment, t.tag)}
                  <small>{t("10% advance + 5% platform fee")}</small>
                </dd>
              </div>
              <div>
                <dt>{t("Remaining rental balance")}</dt>
                <dd>{mad(quote.balance, t.tag)}</dd>
              </div>
              <div>
                <dt>{t("Refundable security deposit")}</dt>
                <dd>{mad(quote.deposit, t.tag)}</dd>
              </div>
            </dl>
            <details>
              <summary>{t("See the price breakdown")}</summary>
              <dl>
                {[
                  ["Partner service price incl. tax", quote.partnerTotal],
                  ["Extras", quote.extras],
                  ["Discounts", -quote.discount],
                  ["VAT included in the service price", quote.taxes],
                  ["Advance on service — 10%", quote.advance],
                  ["Platform service fee — 5%", quote.serviceFee],
                ].map(([label, amount]) => (
                  <div key={label}>
                    <dt>{t(String(label))}</dt>
                    <dd>{mad(Number(amount), t.tag)}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <p className="kc-field-help">
              {t(
                "The deposit is separate from the price. The 10% advance is deducted from your balance.",
              )}
            </p>
          </div>
        )}
        {step === 3 && (
          <label className="kc-compare-check">
            <input name="acceptedTerms" type="checkbox" required />
            <span>
              {t("I accept the conditions for this booking.")}{" "}
              <a className="text-link" href="#partner-conditions">
                {t("Read partner conditions")}
              </a>{" "}
              ·{" "}
              <Link
                className="text-link"
                href="/policies/reservation"
                target="_blank"
              >
                {t("Booking conditions")}
              </Link>
            </span>
          </label>
        )}
        {error && (
          <div className="error-note" role="alert">
            <p>{t(error)}</p>
            {error ===
            "Your session has expired. Sign in again to send your request." ? (
              <Link className="text-link" href={signInHref}>
                {t("Sign in and return to this request")}
              </Link>
            ) : (
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  void mutate();
                  void updateCache(
                    `/api/rental-cars?id=${encodeURIComponent(car.id)}`,
                  );
                  move(1);
                }}
              >
                {t("Refresh price and conditions")}
              </button>
            )}
          </div>
        )}
        {!session && !isPending && (
          <p className="kc-field-help">
            <ShieldCheck size={15} aria-hidden="true" />
            {t(
              "Sign in next to keep your request and documents in one place. Your dates and options will be kept.",
            )}
          </p>
        )}
        <div className="kc-request-actions">
          {step > 1 && (
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() => move(step - 1)}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {t("Back")}
            </button>
          )}
          <button
            className="button"
            type="submit"
            disabled={busy || isPending || !quote || Boolean(quoteError)}
          >
            {t(
              busy
                ? "Sending your request…"
                : isPending
                  ? "Checking your session…"
                  : !session
                    ? "Sign in to continue"
                    : step === 1
                      ? "Continue to my details"
                      : step === 2
                        ? "Review my request"
                        : "Send my booking request",
            )}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        <p className="kc-field-help">
          {t("No payment is taken when you send this request.")}
        </p>
      </form>
    </aside>
  );
}
