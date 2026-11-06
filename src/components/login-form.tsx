"use client";
import { useTranslations } from "@/i18n/provider";
import LanguageSwitcher from "./language-switcher";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Building2, ShieldCheck } from "lucide-react";
function subscribeHydration() {
  return () => {};
}
export default function LoginForm({ demo }: { demo: boolean }) {
  const t = useTranslations();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function login(role?: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(role ? { demo: role } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.assign(data.redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-form">
      <div className="login-language">
        <LanguageSwitcher />
      </div>
      <Link href="/" className="login-back">
        <ArrowLeft aria-hidden="true" focusable="false" size={14} />
        {t("Back to exploring")}
      </Link>
      <div className="eyebrow">{t("Your KraCar workspace")}</div>
      <h1>{t("Good to see you again.")}</h1>
      <p>{t("A clearer view of your business is just ahead.")}</p>
      <form
        aria-busy={busy}
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void login();
        }}
      >
        <label>
          {t("Email address")}
          <input
            autoComplete="username"
            disabled={!hydrated || busy}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("you@yourbusiness.com")}
          />
        </label>
        <label>
          {t("Password")}
          <input
            autoComplete="current-password"
            disabled={!hydrated || busy}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("Your password")}
          />
        </label>
        {error && (
          <div className="error-note" role="alert">
            {t(error)}
          </div>
        )}
        <button className="button large full" disabled={busy || !hydrated}>
          {busy ? t("Opening your workspace…") : t("Sign in")}
          <ArrowRight aria-hidden="true" focusable="false" size={16} />
        </button>
        <p className="muted" style={{ fontSize: ".7rem", textAlign: "center" }}>
          {t("Need access?")}
          {t(" ")}
          <Link href="/support" className="text-link">
            {t("Contact the platform team")}
          </Link>
        </p>
      </form>
      {demo && (
        <div className="demo-login">
          <strong>{t("Take a look around")}</strong>
          <p>
            {t(
              "Explore both workspaces with sample data. Available only in local development.",
            )}
          </p>
          <div className="row">
            <button
              className="button secondary full"
              disabled={busy || !hydrated}
              onClick={() => login("agency")}
            >
              <Building2 aria-hidden="true" focusable="false" size={14} />
              {t("Agency demo")}
            </button>
            <button
              className="button secondary full"
              disabled={busy || !hydrated}
              onClick={() => login("platform")}
            >
              <ShieldCheck aria-hidden="true" focusable="false" size={14} />
              {t("Platform demo")}
            </button>
          </div>
        </div>
      )}
      <p
        className="muted"
        style={{ marginTop: "2rem", fontSize: ".75rem", textAlign: "center" }}
      >
        {t("New to KraCar?")}
        {t(" ")}
        <Link href="/partners" className="text-link">
          {t("Become a partner")}
          <ArrowRight aria-hidden="true" focusable="false" size={13} />
        </Link>
      </p>
    </div>
  );
}
