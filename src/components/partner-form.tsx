"use client";
import { useTranslations } from "@/i18n/provider";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  UploadCloud,
  FileCheck2,
  LockKeyhole,
} from "lucide-react";
import { cities, categories } from "@/lib/catalog";

export default function PartnerForm() {
  const t = useTranslations();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const [document, setDocument] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  function choose(file?: File) {
    setError("");
    if (
      !file ||
      !["application/pdf", "image/jpeg", "image/png"].includes(file.type) ||
      !file.size ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a PDF, JPEG or PNG document no larger than 5 MB.");
      if (input.current) input.current.value = "";
      setDocument(null);
      return;
    }
    setDocument(file);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!document) {
      setError("Choose a PDF, JPEG or PNG document no larger than 5 MB.");
      input.current?.focus();
      return;
    }
    const form = new FormData(event.currentTarget);
    form.set("document", document);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/partners", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="card form-card partner-application"
      aria-label={t("Partner application")}
    >
      {done ? (
        <div className="empty" role="status">
          <div className="empty-icon">
            <Check aria-hidden="true" focusable="false" size={25} />
          </div>
          <h2>{t("We’ve got your introduction.")}</h2>
          <p>
            {t(
              "Your application is now with our platform team for review. Your business will remain private until approved.",
            )}
          </p>
          <Link href="/" className="button">
            {t("Back to Atlas")}
          </Link>
        </div>
      ) : (
        <form aria-busy={busy} className="stack" onSubmit={submit}>
          <p className="muted required-note">
            {t(
              "All fields are required. Have your registration document ready.",
            )}
          </p>
          <div className="field-grid">
            <label>
              {t("Business name")}
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="organization"
                placeholder={t("Your registered company name")}
              />
            </label>
            <label>
              {t("Owner’s full name")}
              <input
                name="owner"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                placeholder={t("First and last name")}
              />
            </label>
            <label>
              {t("Contact email")}
              <input
                name="email"
                type="email"
                required
                maxLength={200}
                autoComplete="email"
                placeholder="you@company.com"
                dir="ltr"
              />
            </label>
            <label>
              {t("Phone number")}
              <input
                name="phone"
                type="tel"
                required
                pattern="\+[0-9\s\(\)\-]{8,24}"
                defaultValue="+212 "
                autoComplete="tel"
                dir="ltr"
              />
            </label>
          </div>
          <label>
            {t("WhatsApp number")}
            <input
              name="whatsapp"
              aria-label={t("WhatsApp number")}
              type="tel"
              required
              pattern="\+[0-9\s\(\)\-]{8,24}"
              defaultValue="+212 "
              dir="ltr"
            />
            <small className="muted">
              {t("Include your country code, for example +212.")}
            </small>
          </label>
          <div className="field-grid">
            <label>
              {t("Your specialty")}
              <select
                name="category"
                aria-label={t("Your specialty")}
                required
                defaultValue=""
              >
                <option value="" disabled>
                  {t("Choose your service")}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.label)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Primary city")}
              <select
                name="city"
                aria-label={t("Primary city")}
                required
                defaultValue=""
              >
                <option value="" disabled>
                  {t("Choose your city")}
                </option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {t(c)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Commercial registration number")}
              <input
                name="registration"
                required
                minLength={2}
                maxLength={80}
                placeholder={t("Registre du Commerce (RC)")}
              />
            </label>
            <label>
              {t("Fleet or service capacity")}
              <input
                name="fleetSize"
                type="number"
                min={1}
                max={10000}
                step={1}
                required
                placeholder={t("Number of vehicles or activities")}
              />
            </label>
          </div>
          <div>
            <label htmlFor="registration-document">
              {t("Registration document")}
            </label>
            <div
              className={`document-drop ${dragging ? "dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                choose(e.dataTransfer.files[0]);
              }}
            >
              {document ? (
                <FileCheck2 aria-hidden="true" focusable="false" size={28} />
              ) : (
                <UploadCloud aria-hidden="true" focusable="false" size={28} />
              )}
              <strong>
                {document ? document.name : t("Choose a file or drop it here")}
              </strong>
              <span>
                {document
                  ? `${(document.size / 1024).toFixed(0)} KB`
                  : t("PDF, JPEG or PNG · up to 5 MB")}
              </span>
              <input
                ref={input}
                id="registration-document"
                type="file"
                name="document"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => choose(e.target.files?.[0])}
                aria-describedby="document-privacy"
              />
            </div>
            <small id="document-privacy" className="document-privacy">
              <LockKeyhole aria-hidden="true" focusable="false" size={12} />
              {t("Only the platform review team can access this document.")}
            </small>
          </div>
          <label>
            {t("A little about your business")}
            <textarea
              name="description"
              required
              minLength={20}
              maxLength={2000}
              placeholder={t(
                "Your services, your experience, and what makes your business special.",
              )}
            />
          </label>
          <label className="check-label">
            <input type="checkbox" name="authority" required />
            <span>{t("I am authorized to represent this business.")}</span>
          </label>
          <label className="check-label">
            <input type="checkbox" name="consent" required />
            <span>
              {t("I accept the booking terms and privacy notice.")}{" "}
              <Link
                href="/policies/terms"
                target="_blank"
                className="text-link"
              >
                {t("Booking terms")}
              </Link>
              {" · "}
              <Link
                href="/policies/privacy"
                target="_blank"
                className="text-link"
              >
                {t("privacy notice")}
              </Link>
            </span>
          </label>
          {error && (
            <p className="error-note" role="alert">
              {t(error)}
            </p>
          )}
          <button className="button large" disabled={busy}>
            {busy ? t("Sending…") : t("Send partner application")}
            <ArrowRight aria-hidden="true" focusable="false" size={16} />
          </button>
        </form>
      )}
    </section>
  );
}
