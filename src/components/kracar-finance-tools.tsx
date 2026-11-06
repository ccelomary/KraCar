"use client";
import Dropdown from "./dropdown";
import { useState } from "react";
import { useTranslations } from "@/i18n/provider";
import { mad } from "@/lib/kracar/time";
import type { WorkspaceData } from "./kracar-workspace";
export function WalletTools({
  data,
  onSave,
}: {
  data: WorkspaceData;
  onSave: (value: Record<string, unknown>) => Promise<unknown>;
}) {
  const t = useTranslations(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    isPlatform = data.actor.role === "platform";
  const balance = (suffix: string) =>
    data.ledgerEntries
      .filter(
        (l) =>
          l.agencyId === data.actor.agencyId &&
          l.account === `${data.actor.agencyId}:${suffix}`,
      )
      .reduce((a, l) => a + l.amount, 0);
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await onSave({
        action: form.get("action"),
        amount: Math.round(Number(form.get("amount")) * 100),
        reference: form.get("reference"),
        agencyId: form.get("agencyId"),
        eventKey: crypto.randomUUID(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="kc-detail-section">
      <h2>{t("Agency wallet and payout records")}</h2>
      <p className="notice">
        {t(
          "Wallet balances come from immutable ledger entries. Payout actions only record transfers performed externally; KraCar does not execute bank transfers.",
        )}
      </p>
      {!isPlatform && (
        <>
          <p>
            <strong>
              {t("Available")}: {mad(balance("wallet_available"), t.tag)} ·{" "}
              {t("Held")}: {mad(balance("wallet_held"), t.tag)}
            </strong>
          </p>
          <form
            onSubmit={send}
            className="kc-search compact"
            style={{ marginTop: 0 }}
          >
            <Dropdown label={<>{t("Operation")}</>} name="action">
              <option value="wallet.deposit-request">
                {t("Request wallet deposit")}
              </option>
              <option value="wallet.payout-request">
                {t("Request payout")}
              </option>
              <option value="wallet.transfer">
                {t("Transfer to agency wallet")}
              </option>
            </Dropdown>
            <label>
              {t("Amount in MAD")}
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label>
              {t("Reference")}
              <input name="reference" required maxLength={200} />
            </label>
            <label>
              {t("Receiving agency ID for transfers")}
              <input name="agencyId" maxLength={100} />
            </label>
            <button className="button" disabled={busy}>
              {t("Submit request")}
            </button>
          </form>
        </>
      )}
      {error && (
        <p className="error-note" role="alert">
          {t(error)}
        </p>
      )}
      <div className="kc-work-cards">
        {data.walletRequests.map((r) => (
          <article className="card kc-work-card" key={r.id}>
            <span className="badge">{t(r.status)}</span>
            <h3>
              {t("Wallet deposit")} · {mad(r.amount, t.tag)}
            </h3>
            <p>
              {r.agencyId} · {r.reference}
            </p>
            {isPlatform && r.status === "requested" && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void onSave({
                    action: "wallet.approve-deposit",
                    id: r.id,
                    reference: `Confirmed external deposit: ${r.reference}`,
                  }).catch(() => {})
                }
              >
                {t("Confirm received funds")}
              </button>
            )}
          </article>
        ))}
        {data.payouts.map((r) => (
          <article className="card kc-work-card" key={r.id}>
            <span className="badge">{t(r.status)}</span>
            <h3>
              {t("Payout record")} · {mad(r.amount, t.tag)}
            </h3>
            <p>
              {r.agencyId} · {r.reference}
            </p>
            {isPlatform && r.status === "requested" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await onSave({
                    action: "wallet.payout-record",
                    id: r.id,
                    reference: f.get("reference"),
                    cancel: f.get("cancel") === "on",
                  }).catch(() => {});
                }}
                className="stack"
              >
                <label>
                  {t("External transfer reference")}
                  <input name="reference" required />
                </label>
                <label className="kc-compare-check">
                  <input type="checkbox" name="cancel" />
                  {t("Cancel and release held funds")}
                </label>
                <button className="button secondary">
                  {t("Record external result")}
                </button>
              </form>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
export function VerificationTools({
  data,
  reload,
  onSave,
}: {
  data: WorkspaceData;
  reload: () => Promise<unknown>;
  onSave: (value: Record<string, unknown>) => Promise<unknown>;
}) {
  const t = useTranslations(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    isPlatform = data.actor.role === "platform";
  return (
    <section className="kc-detail-section">
      <h2>{t("Business verification documents")}</h2>
      {!isPlatform && (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setBusy(true);
            const f = new FormData(e.currentTarget);
            f.set("kind", "verification");
            try {
              const r = await fetch("/api/rental-media", {
                method: "POST",
                body: f,
              });
              const v = await r.json();
              if (!r.ok) throw new Error(v.error);
              await reload();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {t("Business registration document — private")}
            <input
              name="file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              required
            />
          </label>
          <p className="muted">
            {t(
              "PDF, JPEG, PNG or WebP, up to 5 MB. Only your authorized team and platform reviewers can access this file.",
            )}
          </p>
          <button className="button" disabled={busy}>
            {t("Submit verification document")}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="error-note">
          {t(error)}
        </p>
      )}
      <div className="kc-work-cards">
        {data.verificationDocuments.map((d) => (
          <article className="card kc-work-card" key={d.id}>
            <span className="badge">{t(d.status)}</span>
            <p>
              {d.agencyId} · {t(d.kind)}
            </p>
            <a
              className="button secondary"
              href={`/api/rental-media/${d.storageId}`}
            >
              {t("Download private document")}
            </a>
            {d.reason && <p>{d.reason}</p>}
            {isPlatform && (
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await onSave({
                    action: "verification.review",
                    id: d.id,
                    status: f.get("status"),
                    reason: f.get("reason"),
                  }).catch(() => {});
                }}
              >
                <Dropdown label={<>{t("Decision")}</>} name="status">
                  <option value="approved">{t("Approve")}</option>
                  <option value="rejected">{t("Reject")}</option>
                </Dropdown>
                <label>
                  {t("Reason")}
                  <input name="reason" required />
                </label>
                <button className="button">{t("Save review")}</button>
              </form>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
