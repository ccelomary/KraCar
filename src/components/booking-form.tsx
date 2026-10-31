"use client";
import { useTranslations } from "@/i18n/provider";
import { useState, useRef, useEffect, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, LockKeyhole } from "lucide-react";
import type { Listing } from "@/lib/types";
import { cities, money, today } from "@/lib/catalog";
import { plans, quote } from "@/lib/pricing";
import { useHydrated } from "./accessibility";
export default function BookingForm({ listing }: { listing: Listing }) {
  const t = useTranslations();
  const hydrated = useHydrated();
  const params = useSearchParams(),
    router = useRouter();
  const [step, setStep] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const previousStep = useRef(step);
  const errorId = useId();
  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      formRef.current
        ?.querySelector<HTMLElement>("input,select,textarea")
        ?.focus();
    }
  }, [step]);
  const [form, setForm] = useState({
    start: params.get("start") || "",
    end: params.get("end") || "",
    pickup: "",
    returnCity: cities.includes(params.get("returnCity") || "")
      ? params.get("returnCity")!
      : listing.city,
    guests: 1,
    protection: "",
    extras: 0,
    name: "",
    email: "",
    phone: "",
    dob: "",
    licenceDate: "",
    notes: "",
    consent: false,
  });
  function update<K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ) {
    setForm((old) => ({ ...old, [field]: value }));
    setError("");
  }
  const isCar = listing.category === "cars";
  const steps = isCar
    ? ["Your trip", "Protection", "About you"]
    : ["Your trip", "About you"];
  const final = step === steps.length;
  let price;
  try {
    if (form.start && (form.end || !isCar))
      price = quote(
        listing,
        form.start,
        isCar ? form.end : form.start,
        form.protection || "essential",
        form.extras,
        form.guests,
      );
  } catch {}
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!final) {
      if (step === 1 && (!form.start || (isCar && !form.end) || !form.pickup)) {
        setError("Add your dates and pickup location.");
        return;
      }
      if (step === 1 && isCar && form.end <= form.start) {
        setError("Return date must be after pickup.");
        return;
      }
      if (step === 2 && isCar && !form.protection) {
        setError("Choose a protection option to continue.");
        return;
      }
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          listingId: listing.id,
          end: isCar ? form.end : form.start,
          protection: form.protection || "essential",
          dob: form.dob || undefined,
          licenceDate: form.licenceDate || undefined,
          idempotencyKey: key,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/booking/${data.booking.id}#${data.token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside className="booking-panel card" id="booking">
      <div className="row between">
        <h2>{t("Make it your own")}</h2>
        <span className="badge active">{t("Request to book")}</span>
      </div>
      <div className="price-head" style={{ marginTop: ".75rem" }}>
        {t(money(listing.price, t.locale))}
        {t(" ")}
        <small>
          {t("/")}
          {t(" ")}
          {isCar
            ? t("day")
            : listing.category === "activities"
              ? t("person")
              : t("trip")}
        </small>
      </div>
      <ol className="stepper" aria-label={t("Booking progress")}>
        {steps.map((s, i) => (
          <li
            key={s}
            className={`step ${step >= i + 1 ? "active" : ""}`}
            aria-current={step === i + 1 ? "step" : undefined}
          >
            {i + 1}
            {t(". ")}
            {t(s)}
          </li>
        ))}
      </ol>
      <p className="sr-only" role="status">
        {t("Step {0} of {1}: {2}", {
          "0": step,
          "1": steps.length,
          "2": t(steps[step - 1]),
        })}
      </p>
      <form
        aria-busy={busy}
        ref={formRef}
        onSubmit={submit}
        className="stack"
        aria-describedby={error ? errorId : undefined}
      >
        {step === 1 ? (
          <>
            <div className="field-grid">
              <label>
                {isCar ? t("Pickup date") : t("Experience date")}
                <input
                  disabled={!hydrated || busy}
                  required
                  type="date"
                  value={form.start}
                  min={today()}
                  onChange={(e) => update("start", e.target.value)}
                />
              </label>
              {isCar ? (
                <label>
                  {t("Return date")}
                  <input
                    disabled={!hydrated || busy}
                    required
                    type="date"
                    min={form.start || today()}
                    value={form.end}
                    onChange={(e) => update("end", e.target.value)}
                  />
                </label>
              ) : (
                <label>
                  {t("Guests")}
                  <select
                    disabled={!hydrated || busy}
                    value={form.guests}
                    onChange={(e) => update("guests", +e.target.value)}
                  >
                    {Array.from({ length: listing.seats }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1} {i ? t("guests") : t("guest")}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <label>
              {isCar
                ? t("Pickup location")
                : t("Meeting point / pickup address")}
              <input
                disabled={!hydrated || busy}
                required
                minLength={3}
                maxLength={200}
                value={form.pickup}
                onChange={(e) => update("pickup", e.target.value)}
                placeholder={t("{0} airport or your address", {
                  "0": t(listing.city),
                })}
              />
            </label>
            {isCar && (
              <>
                <label>
                  {t("Return city")}
                  <select
                    disabled={!hydrated || busy}
                    aria-label={t("Return city")}
                    value={form.returnCity}
                    onChange={(e) => update("returnCity", e.target.value)}
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {t(c)}
                      </option>
                    ))}
                  </select>
                </label>
                {form.returnCity !== listing.city && (
                  <div className="notice">
                    {t(
                      "One-way travel requires a revised provider quote. You will approve any added fees before payment.",
                    )}
                  </div>
                )}
                <label>
                  {t("Child seats \u00B7 \u20AC5 / seat / day")}
                  <select
                    disabled={!hydrated || busy}
                    value={form.extras}
                    onChange={(e) => update("extras", +e.target.value)}
                  >
                    {[0, 1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n === 0
                          ? t("No child seats")
                          : t("{0} {1}", {
                              "0": n,
                              "1": t(n === 1 ? "seat" : "seats"),
                            })}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </>
        ) : isCar && step === 2 ? (
          <>
            <p className="muted" style={{ fontSize: ".75rem" }}>
              {t(
                "Choose the cover that fits. The security deposit is held separately at pickup.",
              )}
            </p>
            {plans.map((p) => (
              <label
                key={p.id}
                className={`plan-option ${form.protection === p.id ? "selected" : ""}`}
              >
                <input
                  disabled={!hydrated || busy}
                  type="radio"
                  required
                  name="protection"
                  value={p.id}
                  checked={form.protection === p.id}
                  onChange={() => update("protection", p.id)}
                />
                <div>
                  <strong>{t(p.name)}</strong>
                  <small>{t(p.description)}</small>
                  <small>
                    {t(money(p.deposit, t.locale))}
                    {t(" deposit \u00B7 ")}
                    {t(money(p.excess, t.locale))}
                    {t(" excess")}
                  </small>
                  <small>
                    {t("Driver age ")}
                    {p.age}
                    {t("+ \u00B7 Licence held 1+ year")}
                  </small>
                </div>
                <span className="plan-price">
                  {p.price
                    ? t("+{0}", { "0": money(p.price, t.locale) })
                    : t("Included")}
                  <small>{p.price ? t("/ day") : t("")}</small>
                </span>
              </label>
            ))}
          </>
        ) : (
          <>
            <label>
              {t("Full name")}
              <input
                disabled={!hydrated || busy}
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder={t("As it appears on your ID")}
              />
            </label>
            <div className="field-grid">
              <label>
                {t("Email")}
                <input
                  disabled={!hydrated || busy}
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder={t("you@example.com")}
                />
              </label>
              <label>
                {t("Phone / WhatsApp")}
                <input
                  disabled={!hydrated || busy}
                  type="tel"
                  autoComplete="tel"
                  required
                  minLength={6}
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder={t("+212 ...")}
                />
              </label>
            </div>
            {isCar && (
              <div className="field-grid">
                <label>
                  {t("Driver\u2019s birth date")}
                  <input
                    disabled={!hydrated || busy}
                    type="date"
                    required
                    max={today()}
                    value={form.dob}
                    onChange={(e) => update("dob", e.target.value)}
                  />
                </label>
                <label>
                  {t("Licence issue date")}
                  <input
                    disabled={!hydrated || busy}
                    type="date"
                    required
                    max={today()}
                    value={form.licenceDate}
                    onChange={(e) => update("licenceDate", e.target.value)}
                  />
                </label>
              </div>
            )}
            <label>
              {t("Anything else we should know?")}
              <textarea
                disabled={!hydrated || busy}
                maxLength={1500}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder={t(
                  "Flight number, arrival details, special requests…",
                )}
              />
            </label>
            <label className="check-label">
              <input
                disabled={!hydrated || busy}
                type="checkbox"
                required
                checked={form.consent}
                onChange={(e) => update("consent", e.target.checked)}
              />
              <span>
                {t("I accept the")}
                {t(" ")}
                <a
                  className="text-link"
                  href="/policies/terms"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("booking terms")}
                </a>
                {t(" ")}
                {t("and")}
                {t(" ")}
                <a
                  className="text-link"
                  href="/policies/privacy"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("privacy notice")}
                </a>
                {t(
                  ". I understand this is a request, subject to availability and provider approval.",
                )}
              </span>
            </label>
          </>
        )}
        {price && (
          <div className="price-lines">
            <div>
              <span>
                {isCar
                  ? t("{0} days \u00D7 {1}", {
                      "0": price.days,
                      "1": money(listing.price, t.locale),
                    })
                  : listing.category === "activities"
                    ? t("{0} guests \u00D7 {1}", {
                        "0": form.guests,
                        "1": money(listing.price, t.locale),
                      })
                    : t("Experience price")}
              </span>
              <span>{t(money(price.base, t.locale))}</span>
            </div>
            {price.cover > 0 && (
              <div>
                <span>{t("Protection")}</span>
                <span>{t(money(price.cover, t.locale))}</span>
              </div>
            )}
            {price.addOns > 0 && (
              <div>
                <span>{t("Child seats")}</span>
                <span>{t(money(price.addOns, t.locale))}</span>
              </div>
            )}
            <div className="total">
              <span>{t("Request total")}</span>
              <span>{t(money(price.total, t.locale))}</span>
            </div>
            {isCar && (
              <div className="muted">
                <span>{t("Refundable deposit at pickup")}</span>
                <span>{t(money(price.deposit, t.locale))}</span>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="error-note" role="alert" id={errorId}>
            {t(error)}
          </div>
        )}
        <div className="row">
          {step > 1 && (
            <button
              type="button"
              className="button secondary"
              aria-label={t("Previous booking step")}
              onClick={() => {
                setStep(step - 1);
                setError("");
              }}
            >
              <ArrowLeft aria-hidden="true" focusable="false" size={16} />
            </button>
          )}
          <button
            type="submit"
            className="button full"
            disabled={!hydrated || busy}
          >
            {busy
              ? t("Saving your request…")
              : final
                ? t("Send reservation request")
                : t("Continue")}
            <ArrowRight aria-hidden="true" focusable="false" size={16} />
          </button>
        </div>
        <div
          className="row muted"
          style={{ justifyContent: "center", fontSize: ".6rem" }}
        >
          <LockKeyhole aria-hidden="true" focusable="false" size={12} />
          {t("No card details. No payment today.")}
        </div>
      </form>
    </aside>
  );
}
