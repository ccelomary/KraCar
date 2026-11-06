"use client";
import Dropdown from "./dropdown";
import { useTranslations } from "@/i18n/provider";
import { useState } from "react";
import Link from "next/link";
import { Send, Check } from "lucide-react";
export default function SupportForm({
  reference = "",
}: {
  reference?: string;
}) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form),
          consent: form.get("consent") === "on",
        }),
      });
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
    <section className="card form-card">
      {done ? (
        <div className="empty">
          <div className="empty-icon">
            <Check aria-hidden="true" focusable="false" size={24} />
          </div>
          <h2>{t("Your message is with us.")}</h2>
          <p>
            {t(
              "It has been saved in our support inbox. Keep your reservation reference handy for any follow-up.",
            )}
          </p>
          <button className="button secondary" onClick={() => setDone(false)}>
            {t("Send another message")}
          </button>
        </div>
      ) : (
        <>
          <h2>{t("Tell us a little more")}</h2>
          <p>
            {t(
              "We\u2019ll keep your details private and use them to help with your request.",
            )}
          </p>
          <form aria-busy={busy} className="stack" onSubmit={submit}>
            <div className="field-grid">
              <label>
                {t("Your name")}
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
              <label>
                {t("Email address")}
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
            </div>
            <Dropdown
              label={<>{t("What can we help with?")}</>}
              name="subject"
              required
              defaultValue={reference ? "Existing reservation" : ""}
            >
              <option value="">{t("Choose a topic")}</option>
              <option value="Planning my trip">{t("Planning my trip")}</option>
              <option value="Existing reservation">
                {t("Existing reservation")}
              </option>
              <option value="Changes or cancellations">
                {t("Changes or cancellations")}
              </option>
              <option value="Agency access">{t("Agency access")}</option>
              <option value="Something else">{t("Something else")}</option>
            </Dropdown>
            <label>
              <span id="support-message-label">{t("Your message")}</span>
              <textarea
                aria-labelledby="support-message-label"
                name="message"
                defaultValue={
                  reference ? `${t("Booking reference")}: ${reference}\n\n` : ""
                }
                required
                minLength={10}
                maxLength={3000}
                placeholder={t(
                  "Include your reservation reference if you have one.",
                )}
              />
            </label>
            <label className="check-label">
              <input type="checkbox" name="consent" required />
              <span>
                {t("I agree to the")}
                {t(" ")}
                <Link className="text-link" href="/policies/privacy">
                  {t("privacy notice")}
                </Link>
                {t(" ")}
                {t("and the use of my details to respond to this request.")}
              </span>
            </label>
            {error && (
              <div role="alert" className="error-note">
                {t(error)}
              </div>
            )}
            <button className="button" disabled={busy}>
              {busy ? t("Sending…") : t("Send your message")}
              <Send aria-hidden="true" focusable="false" size={14} />
            </button>
          </form>
        </>
      )}
    </section>
  );
}
