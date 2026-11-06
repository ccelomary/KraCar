"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { customerClient } from "@/lib/customer-client";
import { useTranslations } from "@/i18n/provider";
import useSWR from "swr";
import { fetchJson } from "@/lib/client";
import KraCarWorkspace from "./kracar-workspace";
import type { WorkspaceData } from "./kracar-workspace";
export default function KraCarAccount() {
  const t = useTranslations(),
    params = useSearchParams(),
    router = useRouter();
  const [mode, setMode] = useState(params.has("token") ? "reset" : "login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const { data: session, isPending, refetch } = customerClient.useSession();
  const {
    data: actor,
    error: workspaceError,
    mutate: reloadWorkspace,
  } = useSWR<WorkspaceData>(session ? "/api/rental" : null, fetchJson);
  if (isPending)
    return (
      <div className="kc-auth">
        <p role="status">{t("Loading your account…")}</p>
      </div>
    );
  const next = params.get("next");
  const returnPath =
    next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
      ? next
      : null;
  if (session && returnPath)
    return (
      <section className="card kc-auth">
        <span className="eyebrow">{t("You are signed in")}</span>
        <h1>{t("Continue your booking request")}</h1>
        <p>
          {t(
            "Return to your chosen offer to check the price and complete your details.",
          )}
        </p>
        <Link className="button" href={returnPath}>
          {t("Return to my request")} →
        </Link>
      </section>
    );
  if (session && !actor)
    return (
      <section className="card kc-auth">
        <h1>{t("My bookings")}</h1>
        {workspaceError ? (
          <>
            <p role="alert">
              {t(
                "Your account is signed in, but your bookings could not be loaded.",
              )}
            </p>
            <button className="button" onClick={() => void reloadWorkspace()}>
              {t("Try again")}
            </button>
            <Link className="text-link" href="/support">
              {t("Help & support")}
            </Link>
          </>
        ) : (
          <p role="status">{t("Loading your bookings…")}</p>
        )}
      </section>
    );
  if (session && actor) {
    return <KraCarWorkspace initial={actor} />;
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const f = new FormData(e.currentTarget),
      email = String(f.get("email") || ""),
      password = String(f.get("password") || "");
    try {
      if (mode === "recover") {
        const result = await customerClient.requestPasswordReset({
          email,
          redirectTo: "/account",
        });
        if (result.error) throw new Error(result.error.message);
        setNotice(
          "If the account exists, recovery instructions have been prepared. In development, the administrator can access the private email preview.",
        );
        return;
      }
      if (mode === "reset") {
        const result = await customerClient.resetPassword({
          newPassword: password,
          token: params.get("token") || "",
        });
        if (result.error) throw new Error(result.error.message);
        setNotice("Password updated. You can sign in.");
        setMode("login");
        return;
      }
      const result =
        mode === "register"
          ? await customerClient.signUp.email({
              name: String(f.get("name")),
              email,
              password,
            })
          : await customerClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message);
      if (mode === "register") {
        const consent = await fetch("/api/rental", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "account.consent",
            accepted: true,
            version: "2026-11-02",
          }),
        });
        if (!consent.ok)
          throw new Error(
            "Your account was created, but consent could not be recorded. Please contact support.",
          );
      }
      await fetch("/api/auth", { method: "DELETE" });
      if (returnPath) {
        router.push(returnPath);
        return;
      }
      await refetch();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card kc-auth">
      <span className="eyebrow">KraCar</span>
      <h1>
        {t(
          mode === "register"
            ? "Create your account"
            : mode === "recover"
              ? "Recover your password"
              : mode === "reset"
                ? "Choose a new password"
                : "Welcome back",
        )}
      </h1>
      <p>
        {t(
          returnPath
            ? "Sign in to continue your request. Your dates and options will be waiting for you."
            : "Sign in to track requests, read partner replies and find your documents.",
        )}
      </p>
      {returnPath && (
        <Link className="text-link" href={returnPath}>
          ← {t("Back to the offer")}
        </Link>
      )}
      <form onSubmit={submit} className="stack" aria-busy={busy}>
        {mode === "register" && (
          <label>
            {t("Full name")}
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            {t("Email address")}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
            />
          </label>
        )}
        {mode !== "recover" && (
          <label>
            {t("Password")}
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={12}
              maxLength={128}
            />
          </label>
        )}
        {mode === "register" && (
          <div className="stack">
            <p className="notice">
              {t(
                "KraCar is an intermediary. The partner provides your service. Creating an account does not accept any partner’s booking conditions.",
              )}
            </p>
            <label className="kc-compare-check">
              <input type="checkbox" name="termsConsent" required />
              <span>
                {t(
                  "I accept the terms of use and acknowledge the privacy policy.",
                )}{" "}
                <Link
                  className="text-link"
                  href="/policies/terms"
                  target="_blank"
                >
                  {t("Terms of use")}
                </Link>{" "}
                ·{" "}
                <Link
                  className="text-link"
                  href="/policies/privacy"
                  target="_blank"
                >
                  {t("Privacy policy")}
                </Link>
              </span>
            </label>
            <p className="muted">
              {t(
                "Commercial communications are optional. No marketing subscription is created with this account.",
              )}
            </p>
            <Link className="text-link" href="/partners">
              {t("Are you a professional? Become a partner")}
            </Link>
          </div>
        )}
        {error && (
          <p className="error-note" role="alert">
            {t(error)}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {t(notice)}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy
            ? t("Please wait…")
            : t(
                mode === "register"
                  ? "Create account"
                  : mode === "recover"
                    ? "Send recovery instructions"
                    : mode === "reset"
                      ? "Update password"
                      : "Sign in",
              )}
        </button>
      </form>
      <div className="row wrap" style={{ marginTop: "1rem" }}>
        {mode !== "login" && (
          <button className="text-link" onClick={() => setMode("login")}>
            {t("Sign in")}
          </button>
        )}
        {mode !== "register" && (
          <button className="text-link" onClick={() => setMode("register")}>
            {t("Create account")}
          </button>
        )}
        {mode === "login" && (
          <button className="text-link" onClick={() => setMode("recover")}>
            {t("Forgot password?")}
          </button>
        )}
      </div>
    </section>
  );
}
