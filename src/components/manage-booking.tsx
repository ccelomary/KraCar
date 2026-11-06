"use client";
import { useTranslations } from "@/i18n/provider";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  LockKeyhole,
  ArrowRight,
  CalendarDays,
  RefreshCw,
  Download,
} from "lucide-react";
import type { Booking } from "@/lib/types";
import { money, dateLabel } from "@/lib/catalog";
import { Badge, Empty, Modal } from "./ui";
export default function ManageBooking({ id }: { id: string }) {
  const t = useTranslations();
  const [booking, setBooking] = useState<Booking | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [link, setLink] = useState(""),
    [copied, setCopied] = useState(false),
    [busy, setBusy] = useState(false),
    [cancelOpen, setCancelOpen] = useState(false);
  const tokenRef = useRef("");
  const request = useCallback(
    async (cancel = false) => {
      const token = tokenRef.current;
      const res = await fetch("/api/booking-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...(token ? { token } : {}), cancel }),
      });
      const value = await res.json();
      if (!res.ok) throw new Error(value.error);
      return value as Booking;
    },
    [id],
  );
  async function load(cancel = false) {
    setBusy(true);
    try {
      const value = await request(cancel);
      setError("");
      setBooking(value);
      setCancelOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }
  useEffect(() => {
    tokenRef.current ||= window.location.hash.slice(1);
    if (tokenRef.current) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    let active = true;
    void request()
      .then((value) => {
        if (!active) return;
        setBooking(value);
        if (tokenRef.current)
          setLink(
            `${window.location.origin}/booking/${id}#${tokenRef.current}`,
          );
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request, id]);
  function save() {
    if (!booking) return;
    const text = [
      t("KraCar — Reservation request"),
      booking.id,
      `${t("Status")}: ${t(booking.status.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase()))}`,
      t(booking.listingName),
      `${dateLabel(booking.start, t.locale)} – ${dateLabel(booking.end, t.locale)}`,
      `${t("Request value")}: ${money(booking.total, t.locale)}`,
      `${t("Private access")}: ${link || t("Use this browser to access your booking.")}`,
      t(
        "This is not a confirmed travel voucher. No payment has been collected.",
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${booking.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  if (loading)
    return (
      <div className="confirmation">
        <div className="skeleton" />
        <div
          className="skeleton"
          style={{ marginTop: "1rem", height: "18rem" }}
        />
      </div>
    );
  if (!booking)
    return (
      <div className="confirmation">
        <Empty
          headingLevel={1}
          title={t("Your private reservation space")}
          description={t(
            error ||
              "Open the private link you saved when requesting your trip.",
          )}
        >
          <button className="button secondary" onClick={() => load()}>
            {t("Try again")}
          </button>
          <Link href="/support" className="text-link">
            {t("Get help accessing your request")}
          </Link>
        </Empty>
      </div>
    );
  return (
    <div className="confirmation">
      <div className="confirmation-icon">
        <Check aria-hidden="true" focusable="false" size={28} />
      </div>
      <div
        className="eyebrow"
        style={{ textAlign: "center", marginBottom: ".5rem" }}
      >
        {t("Your next journey starts here")}
      </div>
      <h1>
        {booking.status === "requested"
          ? t("Request received. Adventure ahead.")
          : booking.status === "cancelled"
            ? t("Your request has been cancelled.")
            : t("A clear view of your reservation.")}
      </h1>
      <p>
        {booking.status === "requested"
          ? t(
              "Your provider will review availability and the details. Keep your private access link below.",
            )
          : t("Review your current reservation details and status below.")}
      </p>
      <div className="card form-card">
        <div className="row between wrap">
          <div>
            <small className="muted">{t("Reservation reference")}</small>
            <h2>{t(booking.id)}</h2>
          </div>
          <Badge status={booking.status} />
        </div>
        <dl className="detail-grid">
          {[
            ["Your experience", t(booking.listingName)],
            ["Traveler", booking.name],
            [
              "Trip dates",
              `${dateLabel(booking.start, t.locale)} – ${dateLabel(booking.end, t.locale)}`,
            ],
            ["Pickup", booking.pickup],
            ["Request total", money(booking.total, t.locale)],
            ["Security deposit", money(booking.deposit, t.locale)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{t(k)}</dt>
              <dd>
                <bdi dir="auto">{v}</bdi>
              </dd>
            </div>
          ))}
        </dl>
        <div className="notice">
          <strong>
            {booking.status === "confirmed"
              ? t("Your provider has confirmed this trip.")
              : t("This is a reservation request, not a confirmed booking.")}
          </strong>
          <p style={{ marginTop: ".4rem" }}>
            {t(
              "No payment is collected on this site. Our team reviews availability before coordinating next steps. Prices may require your approval if route or supplier conditions change.",
            )}
          </p>
        </div>
        {link && (
          <div style={{ marginTop: "1.5rem" }}>
            <div className="row" style={{ marginBottom: ".7rem" }}>
              <LockKeyhole aria-hidden="true" focusable="false" size={15} />
              <strong style={{ fontSize: ".8rem" }}>
                {t("Keep your private booking link")}
              </strong>
            </div>
            <p
              className="muted"
              style={{ fontSize: ".75rem", marginBottom: ".7rem" }}
            >
              {t(
                "This link gives access to your reservation. Save it somewhere safe and avoid sharing it.",
              )}
            </p>
            <div className="private-link">{t(link)}</div>
            <button
              className="button secondary full"
              style={{ marginTop: ".7rem" }}
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
            >
              <Copy aria-hidden="true" focusable="false" size={14} />
              {copied ? t("Private link copied") : t("Copy private link")}
            </button>
          </div>
        )}
        {error && (
          <div
            className="error-note"
            style={{ marginTop: "1rem" }}
            role="alert"
          >
            {t(error)}
          </div>
        )}
        <div className="row wrap" style={{ marginTop: "1.5rem" }}>
          <button className="button secondary" onClick={save}>
            <Download aria-hidden="true" focusable="false" size={14} />
            {t("Save request")}
          </button>
          <button
            className="button secondary"
            onClick={() => load()}
            disabled={busy}
          >
            <RefreshCw aria-hidden="true" focusable="false" size={14} />
            {t("Refresh status")}
          </button>
          {["requested", "awaiting_payment"].includes(booking.status) && (
            <button
              className="button danger"
              onClick={() => setCancelOpen(true)}
            >
              {t("Cancel request")}
            </button>
          )}
        </div>
      </div>
      <div className="row between wrap" style={{ marginTop: "1.5rem" }}>
        <Link className="text-link" href="/support">
          <CalendarDays aria-hidden="true" focusable="false" size={15} />
          {t("Need to change something?")}
        </Link>
        <Link className="text-link" href="/explore">
          {t("Keep exploring")}
          <ArrowRight aria-hidden="true" focusable="false" size={14} />
        </Link>
      </div>
      {cancelOpen && (
        <Modal
          title={t("Cancel your reservation request?")}
          onClose={() => setCancelOpen(false)}
        >
          <p className="muted">
            {t("This will withdraw your request for ")}
            {t(booking.listingName)}
            {t(". You can make a new request whenever you\u2019re ready.")}
          </p>
          <div className="dialog-actions" style={{ marginTop: "1.5rem" }}>
            <button
              className="button secondary"
              onClick={() => setCancelOpen(false)}
            >
              {t("Keep my request")}
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => load(true)}
            >
              {busy ? t("Cancelling…") : t("Yes, cancel request")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
