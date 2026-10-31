"use client";
import { useTranslations } from "@/i18n/provider";
import LanguageSwitcher from "./language-switcher";
import Link from "next/link";
import {
  useState,
  useSyncExternalStore,
  useRef,
  useId,
  useCallback,
} from "react";
import { useNavigationFocus } from "./accessibility";
import {
  Menu,
  X,
  ArrowUpRight,
  Headphones,
  ChevronDown,
  MessageCircle,
  ArrowUp,
} from "lucide-react";
import { Brand } from "./ui";
export function PublicHeader() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const navId = useId();
  const close = useCallback(() => setOpen(false), []);
  useNavigationFocus(open, nav, toggle, close);
  return (
    <div className="site-header" role="banner">
      <div className="announcement">
        <span>{t("Morocco, made easier. Car rentals & things to do.")}</span>
        <Link href="/support">{t("Here to help")}</Link>
      </div>
      <div className="public-header">
        <Brand />
        <nav
          id={navId}
          ref={nav}
          className={`public-nav ${open ? "open" : ""}`}
          aria-label={t("Main navigation")}
        >
          <details
            className="travel-menu"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.currentTarget.open = false;
                e.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary>
              {t("Explore Morocco")}
              <ChevronDown aria-hidden="true" focusable="false" size={14} />
            </summary>
            <div className="travel-menu-items">
              <Link href="/explore?category=cars">{t("Car rentals")}</Link>
              <Link href="/explore?category=activities">
                {t("Things to do")}
              </Link>
            </div>
          </details>
          <div className="mobile-service-links">
            <Link onClick={() => setOpen(false)} href="/explore?category=cars">
              {t("Car rentals")}
            </Link>
            <Link
              onClick={() => setOpen(false)}
              href="/explore?category=activities"
            >
              {t("Things to do")}
            </Link>
          </div>
          <Link onClick={() => setOpen(false)} href="/support">
            <Headphones aria-hidden="true" focusable="false" size={16} />
            {t("Help & support")}
          </Link>
          <Link
            onClick={() => setOpen(false)}
            href="/partners"
            className="button partner-nav-link"
          >
            {t("Become a partner")}
          </Link>
        </nav>
        <div className="public-header-actions">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="button secondary"
            aria-label={t("Partner sign in")}
          >
            <span className="partner-signin-label">
              {t("Partner sign in ")}
            </span>
            <ArrowUpRight aria-hidden="true" focusable="false" size={14} />
          </Link>
          <button
            ref={toggle}
            className="icon-button mobile-toggle"
            aria-label={open ? t("Close navigation") : t("Open navigation")}
            aria-expanded={open}
            aria-controls={navId}
            onClick={() => setOpen(!open)}
          >
            {open ? (
              <X aria-hidden="true" focusable="false" size={18} />
            ) : (
              <Menu aria-hidden="true" focusable="false" size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
export function PublicFooter() {
  const t = useTranslations();
  return (
    <footer className="public-footer">
      <div className="public-container">
        <div className="footer-grid">
          <div>
            <Brand />
            <p>
              {t(
                "Local connections. Open roads. A little more Morocco, at your own pace.",
              )}
            </p>
          </div>
          <div>
            <h2>{t("Your next journey")}</h2>
            <Link href="/explore?category=cars">{t("Find your car")}</Link>
            <Link href="/explore?category=activities">
              {t("Local experiences")}
            </Link>
          </div>
          <div>
            <h2>{t("We\u2019re here for you")}</h2>
            <Link href="/support">{t("Help & support")}</Link>
            <Link href="/partners">{t("Become a partner")}</Link>
            <Link href="/login">{t("Partner workspace")}</Link>
            <Link href="/faq">{t("Common questions")}</Link>
            <Link href="/about">{t("About Atlas")}</Link>
            <Link href="/blog">{t("Atlas travel notes")}</Link>
            <Link href="/policies/privacy">{t("Privacy & cookies")}</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            {t("\u00A9 ")}
            {new Date().getFullYear()}
            {t(" Atlas Journeys. An independent travel platform.")}
          </span>
          <div className="row">
            <Link href="/policies/terms">{t("Booking terms")}</Link>
            <span>{t("\u00B7")}</span>
            <Link href="/policies/cancellation">
              {t("Cancellation policy")}
            </Link>
            <span>{t("\u00B7")}</span>
            <span>{t("Prices in EUR")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
function subscribeCookieChoice(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("atlas-cookie-choice", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("atlas-cookie-choice", callback);
  };
}
function cookieSnapshot() {
  try {
    return !localStorage.getItem("atlas-cookie-choice");
  } catch {
    return false;
  }
}
export function CookiesNotice() {
  const t = useTranslations();
  const show = useSyncExternalStore(
    subscribeCookieChoice,
    cookieSnapshot,
    () => false,
  );
  function choose(value: string) {
    localStorage.setItem("atlas-cookie-choice", value);
    window.dispatchEvent(new Event("atlas-cookie-choice"));
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }
  if (!show) return null;
  return (
    <aside className="cookie-banner" aria-label={t("Cookie preferences")}>
      <strong>{t("A little housekeeping")}</strong>
      <p>
        {t(
          "We use essential cookies to keep your session and reservation secure. Optional analytics are off.",
        )}
        {t(" ")}
        <Link className="text-link" href="/policies/privacy">
          {t("Read our privacy notice")}
        </Link>
      </p>
      <div className="row">
        <button className="button" onClick={() => choose("essential")}>
          {t("Essential only")}
        </button>
        <button className="button secondary" onClick={() => choose("all")}>
          {t("Accept preferences")}
        </button>
      </div>
    </aside>
  );
}
export default function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-shell">
      <PublicHeader />
      {children}
      <PublicFooter />
      <FloatingHelp />
      <CookiesNotice />
    </div>
  );
}

function FloatingHelp() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  return (
    <div
      className="floating-tools"
      role="complementary"
      aria-label={t("Help & support")}
    >
      {open && (
        <aside className="help-popover" aria-label={t("Help & support")}>
          <div className="row between">
            <h3>{t("How can we help?")}</h3>
            <button
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label={t("Close")}
            >
              <X aria-hidden="true" focusable="false" size={16} />
            </button>
          </div>
          <p>{t("Choose a service or send a message to our team.")}</p>
          <Link href="/support" className="button">
            {t("Help & support")}
            <ArrowUpRight aria-hidden="true" focusable="false" size={15} />
          </Link>
          <Link href="/faq" className="text-link">
            {t("Common questions")}
          </Link>
        </aside>
      )}
      <button
        className="help-fab"
        aria-label={t("How can we help?")}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <MessageCircle aria-hidden="true" focusable="false" size={26} />
      </button>
      <a href="#main-content" className="top-fab" aria-label={t("Back to top")}>
        <ArrowUp aria-hidden="true" focusable="false" size={18} />
      </a>
    </div>
  );
}
