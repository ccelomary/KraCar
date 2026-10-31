"use client";
import { useTranslations } from "@/i18n/provider";
import { useEffect, useRef, useId, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Mountain, X, Inbox, Check } from "lucide-react";
export function Brand() {
  const t = useTranslations();
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">
        <Mountain
          aria-hidden="true"
          focusable="false"
          size={24}
          strokeWidth={1.6}
        />
      </span>
      <span>
        {t("atlas")}
        <span className="muted">{t(" journeys")}</span>
        <small>{t("Made for the journey")}</small>
      </span>
      <span className="sr-only">{t("Atlas Journeys home")}</span>
    </Link>
  );
}
export function Badge({ status }: { status: string }) {
  const t = useTranslations();
  return (
    <span className={`badge ${status}`}>
      {t(status.replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase()))}
    </span>
  );
}
export function Empty({
  title,
  description,
  children,
  headingLevel = 2,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  headingLevel?: 1 | 2 | 3;
}) {
  const t = useTranslations();
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox aria-hidden="true" focusable="false" size={24} />
      </div>
      <Heading>{t(title)}</Heading>
      <p>{t(description)}</p>
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const t = useTranslations();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    el?.showModal();
    el?.querySelector<HTMLButtonElement>(".dialog-header button")?.focus();
    return () => {
      el?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog-backdrop"
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        closeRef.current();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const targets = [
          ...e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
          ),
        ].filter(
          (el) =>
            el.getClientRects().length &&
            getComputedStyle(el).visibility !== "hidden",
        );
        const first = targets[0],
          last = targets.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog">
        <div className="dialog-header">
          <h2 id={titleId}>{t(title)}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t("Close dialog")}
          >
            <X aria-hidden="true" focusable="false" size={18} />
          </button>
        </div>
        <div className="dialog-content">{children}</div>
      </div>
    </dialog>
  );
}
export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  const t = useTranslations();
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [message, onClose]);
  return (
    <div className="toast" role="status">
      <Check aria-hidden="true" focusable="false" size={16} />
      {t(message)}
    </div>
  );
}
export function ArrowLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpRight aria-hidden="true" focusable="false" size={15} />
    </Link>
  );
}
