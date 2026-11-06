"use client";
import Dropdown from "./dropdown";
import { useTranslations } from "@/i18n/provider";
import { matchesSearch } from "@/i18n/search";
import LanguageSwitcher from "./language-switcher";
import AgencyManagement from "./agency-management";
import AgencyContracts from "./agency-contracts";
import {
  initials,
  PageIntro,
  Stat,
  RevenueChart,
  CategoryChart,
  BookingTable,
  BookingDetails,
  AgencyCard,
  AccessForm,
  ListingEditor,
  Settings,
  Calendar,
} from "./dashboard-parts";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useId, useCallback, useEffect } from "react";
import { useNavigationFocus, handleTabKeys } from "./accessibility";
import useSWR from "swr";
import { fetchJson } from "@/lib/client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CarFront,
  Building2,
  Settings2,
  LifeBuoy,
  LogOut,
  ChevronRight,
  ChevronsUpDown,
  Search,
  Bell,
  Download,
  Plus,
  ArrowUpRight,
  TrendingUp,
  CircleDollarSign,
  BookOpen,
  Clock3,
  Menu,
  X,
  MapPin,
  Mail,
  Pencil,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Inbox,
  FilterX,
  Users,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  DashboardData,
  Role,
  Booking,
  Listing,
  Agency,
} from "@/lib/types";
import { money, dateLabel, today, categories } from "@/lib/catalog";
import { Brand, Badge, Empty, Modal, Toast } from "./ui";
const statusLabels: Record<string, string> = {
  all: "All reservations",
  requested: "Needs review",
  awaiting_payment: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};
const sectionNames: Record<string, string> = {
  overview: "Overview",
  bookings: "Reservations",
  fleet: "My listings",
  listings: "All listings",
  calendar: "Calendar",
  agencies: "Agencies",
  support: "Support inbox",
  settings: "Settings",
  contacts: "Clients",
  vehicles: "Fleet overview",
  invoices: "Invoices",
  contracts: "Contracts",
};
const navigation: {
  id: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["agency", "platform"],
  },
  {
    id: "bookings",
    label: "Reservations",
    icon: BookOpen,
    roles: ["agency", "platform"],
  },
  { id: "fleet", label: "My listings", icon: CarFront, roles: ["agency"] },
  {
    id: "vehicles",
    label: "Fleet overview",
    icon: CarFront,
    roles: ["agency"],
  },
  { id: "contacts", label: "Clients", icon: Users, roles: ["agency"] },
  { id: "invoices", label: "Invoices", icon: FileText, roles: ["agency"] },
  { id: "contracts", label: "Contracts", icon: FileText, roles: ["agency"] },
  { id: "agencies", label: "Agencies", icon: Building2, roles: ["platform"] },
  {
    id: "listings",
    label: "All listings",
    icon: CarFront,
    roles: ["platform"],
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarDays,
    roles: ["agency", "platform"],
  },
  {
    id: "support",
    label: "Support inbox",
    icon: LifeBuoy,
    roles: ["platform"],
  },
];
function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
}
function exportBookings(
  bookings: Booking[],
  t: ReturnType<typeof useTranslations>,
) {
  const fields = [
    "Reference",
    "Traveler",
    "Experience",
    "Start",
    "End",
    "Status",
    "Value EUR",
  ].map((label) => t(label));
  const rows = bookings.map((b) => [
    b.id,
    b.name,
    t(b.listingName),
    b.start,
    b.end,
    t(
      b.status
        .replaceAll("_", " ")
        .replace(/^./, (character) => character.toUpperCase()),
    ),
    (b.total / 100).toFixed(2),
  ]);
  const blob = new Blob(
    [
      "\uFEFF" +
        [fields, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `atlas-reservations-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
export default function Dashboard({
  role,
  userId,
}: {
  role: Role;
  userId: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const section = usePathname().split("/")[2] || "overview";
  const searchParams = useSearchParams();
  const [reportTime, setReportTime] = useState(() => Date.now());
  const {
    data,
    isLoading: loading,
    error: loadError,
    mutate: load,
  } = useSWR<DashboardData>(
    `/api/workspace?viewer=${encodeURIComponent(userId)}`,
    fetchJson,
    {
      dedupingInterval: 30000,
      onSuccess() {
        setReportTime(Date.now());
      },
      onError(error) {
        if (error.status === 401) router.push("/login");
      },
    },
  );
  const error = loadError?.message || "";
  const [open, setOpen] = useState(false),
    [period, setPeriod] = useState(30),
    [search, setSearch] = useState(searchParams.get("q") || ""),
    [selected, setSelected] = useState<Booking | null>(null),
    [editing, setEditing] = useState<Listing | "new" | null>(null),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [notifications, setNotifications] = useState(false);
  const [accessAgency, setAccessAgency] = useState<Agency | null>(null);
  const [suspendAgency, setSuspendAgency] = useState<Agency | null>(null);
  const [agencySort, setAgencySort] = useState("review");
  const [ticketStatus, setTicketStatus] = useState("all");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [listingVisibility, setListingVisibility] = useState("all");
  const [listingCategory, setListingCategory] = useState("all");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const sidebarId = useId();
  const tabsId = useId();
  const closeNavigation = useCallback(() => setOpen(false), []);
  useNavigationFocus(open, sidebarRef, menuRef, closeNavigation);
  const lastSection = useRef(section);
  useEffect(() => {
    if (lastSection.current !== section) {
      lastSection.current = section;
      const heading = document.querySelector<HTMLElement>(
        ".workspace-content h1",
      );
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    }
  }, [section]);
  // Preserve the shell and cached records; reset only the controls for the new view.
  const viewKey = `${section}:${searchParams.get("q") || ""}`;
  const [previousView, setPreviousView] = useState(viewKey);
  if (previousView !== viewKey) {
    setPreviousView(viewKey);
    setSearch(searchParams.get("q") || "");
    setOpen(false);
    setSelected(null);
    setEditing(null);
    setAccessAgency(null);
    setSuspendAgency(null);
    setActionError("");
    setNotifications(false);
    setTicketStatus("all");
    setListingVisibility("all");
    setListingCategory("all");
    setAgencySort("review");
  }
  const base = role === "platform" ? "/platform" : "/agency";
  const isPlatform = role === "platform";
  const requestedStatus = searchParams.get("status") || "all";
  const status = Object.hasOwn(statusLabels, requestedStatus)
    ? requestedStatus
    : "all";
  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("status");
    else params.set("status", value);
    // The records are already loaded. Save the local filter without a server navigation.
    window.history.replaceState(null, "", `${base}/bookings?${params}`);
  }
  async function mutate(body: Record<string, unknown>, message: string) {
    setBusy(true);
    setActionError("");
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const value = await res.json();
      if (!res.ok) throw new Error(value.error);
      await load();
      setToast(message);
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const cutoff = new Date(reportTime - period * 86400000).toISOString();
  const bookings = data?.bookings || [],
    listings = data?.listings || [],
    agencies = data?.agencies || [];
  const recent = bookings.filter(
    (b) =>
      b.createdAt >= cutoff &&
      b.createdAt <= new Date(reportTime).toISOString(),
  );
  const accepted = recent.filter((b) =>
    ["confirmed", "completed"].includes(b.status),
  );
  const value = accepted.reduce((sum, b) => sum + b.total, 0);
  const pending = bookings.filter((b) => b.status === "requested");
  const activeAgencies = agencies.filter((a) => a.status === "active");
  const currentAgency = agencies.find((a) => a.id === data?.session.agencyId);
  const agencyStatus = ["pending", "active", "suspended"].includes(
    searchParams.get("status") || "",
  )
    ? searchParams.get("status")!
    : "all";
  const reviewAgencies = agencies.filter((a) => a.status === "pending");
  const openTickets = (data?.tickets || []).filter(
    (ticket) => ticket.status === "open",
  );
  const visibleAgencies = agencies
    .filter(
      (a) =>
        (agencyStatus === "all" || a.status === agencyStatus) &&
        matchesSearch(
          search,
          [a.name, a.city, a.email, a.owner || "", t(a.city)],
          t.locale,
        ),
    )
    .sort((a, b) =>
      agencySort === "name"
        ? a.name.localeCompare(b.name, t.locale)
        : (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) ||
          b.joined.localeCompare(a.joined),
    );
  const visibleTickets = (data?.tickets || []).filter(
    (ticket) =>
      (ticketStatus === "all" || ticket.status === ticketStatus) &&
      matchesSearch(
        search,
        [
          ticket.name,
          ticket.email,
          ticket.subject,
          t(ticket.subject),
          ticket.message,
        ],
        t.locale,
      ),
  );
  const visibleListings = listings.filter(
    (l) =>
      (listingVisibility === "all" || l.status === listingVisibility) &&
      (listingCategory === "all" || l.category === listingCategory) &&
      matchesSearch(search, [l.name, l.city, t(l.name), t(l.city)], t.locale),
  );
  function filterAgencies(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("status");
    else params.set("status", value);
    window.history.replaceState(null, "", `${base}/agencies?${params}`);
  }
  const workspaceName = isPlatform
    ? "Platform workspace"
    : currentAgency?.name || "Agency workspace";
  const filtered = bookings.filter(
    (b) =>
      (status === "all" || b.status === status) &&
      matchesSearch(
        search,
        [b.name, b.id, b.listingName, b.city, t(b.listingName), t(b.city)],
        t.locale,
      ),
  );
  async function signout() {
    await fetch("/api/auth", { method: "DELETE" });
    // Authentication changes reset every client cache to prevent stale account data.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }
  function openBooking(booking: Booking) {
    setActionError("");
    setSelected(booking);
  }
  return (
    <div className={`workspace ${isPlatform ? "platform-workspace" : ""}`}>
      <button
        tabIndex={-1}
        className={`sidebar-scrim ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-label={t("Close navigation")}
      />
      <div
        ref={sidebarRef}
        id={sidebarId}
        className={`sidebar ${open ? "is-open" : ""}`}
        role={open ? "dialog" : "complementary"}
        aria-modal={open || undefined}
        aria-label={t("Workspace navigation")}
      >
        <Brand />
        <button
          className="icon-button mobile-toggle sidebar-close"
          aria-label={t("Close navigation")}
          onClick={closeNavigation}
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className="workspace-switch">
          <div className="avatar green">
            {isPlatform ? (
              <ShieldCheck aria-hidden="true" focusable="false" size={17} />
            ) : (
              <Building2 aria-hidden="true" focusable="false" size={17} />
            )}
          </div>
          <div>
            <strong>{t(workspaceName)}</strong>
            <small>
              {isPlatform
                ? t("Platform administration")
                : t("Agency workspace")}
            </small>
          </div>
          <ChevronsUpDown
            aria-hidden="true"
            focusable="false"
            size={13}
            className="muted"
            style={{ marginLeft: "auto" }}
          />
        </div>
        <div className="nav-label">{t("Workspace")}</div>
        <nav className="side-nav" aria-label={t("Workspace navigation")}>
          <Link href="/workspace" className="side-link">
            <CarFront aria-hidden="true" size={18} />
            {t("KraCar rental operations")}
          </Link>
          {navigation
            .filter((n) => n.roles.includes(role))
            .map((n) => (
              <Link
                key={n.id}
                href={n.id === "overview" ? base : `${base}/${n.id}`}
                className={`side-link ${section === n.id ? "active" : ""}`}
                aria-current={section === n.id ? "page" : undefined}
              >
                <n.icon
                  aria-hidden="true"
                  focusable="false"
                  size={18}
                  strokeWidth={1.7}
                />
                {t(n.label)}
                {n.id === "bookings" && pending.length > 0 && (
                  <span className="nav-count">{pending.length}</span>
                )}
                {n.id === "agencies" &&
                  agencies.filter((a) => a.status === "pending").length > 0 && (
                    <span className="nav-count">
                      {agencies.filter((a) => a.status === "pending").length}
                    </span>
                  )}
                {n.id === "support" && openTickets.length > 0 && (
                  <span className="nav-count">{openTickets.length}</span>
                )}
              </Link>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="row">
              <LifeBuoy
                aria-hidden="true"
                focusable="false"
                size={16}
                className="muted"
              />
              <strong>{t("A little help?")}</strong>
            </div>
            <p>{t("Good journeys start with a team you can count on.")}</p>
            <Link className="text-link" href="/support">
              {t("Visit help center ")}
              <ArrowUpRight aria-hidden="true" focusable="false" size={13} />
            </Link>
          </div>
          <Link
            href={`${base}/settings`}
            className={`side-link ${section === "settings" ? "active" : ""}`}
            aria-current={section === "settings" ? "page" : undefined}
          >
            <Settings2 aria-hidden="true" focusable="false" size={18} />
            {t("Settings")}
          </Link>
          <Link href="/" className="side-link">
            <ExternalLink aria-hidden="true" focusable="false" size={17} />
            {t("View storefront")}
          </Link>
          <div className="sidebar-user">
            <div className="avatar">
              {t(initials(data?.session.name || "A"))}
            </div>
            <div>
              <strong>{data?.session.name || t("Your account")}</strong>
              <small>
                {isPlatform ? t("Platform administrator") : t("Agency manager")}
              </small>
            </div>
            <button
              onClick={signout}
              className="button ghost"
              style={{ marginLeft: "auto" }}
              aria-label={t("Sign out")}
            >
              <LogOut aria-hidden="true" focusable="false" size={15} />
            </button>
          </div>
        </div>
      </div>
      <div className="workspace-main" inert={open}>
        <header className="workspace-topbar">
          <div className="row">
            <button
              ref={menuRef}
              className="icon-button mobile-toggle"
              onClick={() => setOpen(!open)}
              aria-label={t("Open workspace navigation")}
              aria-expanded={open}
              aria-controls={sidebarId}
            >
              {open ? (
                <X aria-hidden="true" focusable="false" size={18} />
              ) : (
                <Menu aria-hidden="true" focusable="false" size={18} />
              )}
            </button>
            <div className="breadcrumb">
              <span>{isPlatform ? t("Platform") : t("Workspace")}</span>
              <ChevronRight aria-hidden="true" focusable="false" size={12} />
              <strong>{t(sectionNames[section] || "Page not found")}</strong>
            </div>
          </div>
          <div className="row topbar-actions">
            <LanguageSwitcher />
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(
                  `${base}/bookings?q=${encodeURIComponent(workspaceSearch)}`,
                );
              }}
            >
              <Search aria-hidden="true" focusable="false" size={15} />
              <input
                aria-label={t("Search reservations")}
                placeholder={t("Find a reservation…")}
                value={workspaceSearch}
                onChange={(e) => {
                  setWorkspaceSearch(e.target.value);
                }}
              />
            </form>
            <Link href="/" className="button ghost">
              {t("View website ")}
              <ArrowUpRight aria-hidden="true" focusable="false" size={13} />
            </Link>
            <span className="top-divider" />
            <button
              className="icon-button"
              aria-label={t("View notifications")}
              onClick={() => setNotifications(true)}
            >
              <Bell aria-hidden="true" focusable="false" size={17} />
              {isPlatform &&
                pending.length + reviewAgencies.length + openTickets.length >
                  0 && <span className="notification-indicator" />}
            </button>
            <Link
              href={`${base}/settings`}
              className="avatar green"
              aria-label={`${initials(data?.session.name || "A")} ${t("Account settings")}`}
              title={t("Account settings")}
            >
              <span aria-hidden="true">
                {t(initials(data?.session.name || "A"))}
              </span>
            </Link>
          </div>
        </header>
        <main className="workspace-content" id="main-content" tabIndex={-1}>
          {loading && !data ? (
            <>
              <div
                className="skeleton"
                style={{ height: "4rem", marginBottom: "1.5rem" }}
              />
              <div className="stat-grid">
                {[1, 2, 3, 4].map((n) => (
                  <div className="skeleton" key={n} />
                ))}
              </div>
              <div className="skeleton" style={{ height: "20rem" }} />
            </>
          ) : error && !data ? (
            <div className="card">
              <Empty
                headingLevel={1}
                title={t("We hit a small detour")}
                description={error}
              >
                <button
                  className="button"
                  onClick={() => {
                    void load();
                  }}
                >
                  {t("Try again")}
                </button>
              </Empty>
            </div>
          ) : data ? (
            <>
              {error && (
                <p className="error-note" role="alert">
                  {t(error)}{" "}
                  <button className="button ghost" onClick={() => void load()}>
                    {t("Try again")}
                  </button>
                </p>
              )}
              {data.demo && (
                <div className="demo-strip">
                  <span />
                  {t(
                    "Sample workspace \u00B7 All people, agencies, and activity shown are demonstration data.",
                  )}
                </div>
              )}
              {!isPlatform && section === "overview" && (
                <AgencyManagement section="summary" workspace={data} />
              )}
              {!isPlatform && section === "contracts" ? (
                <AgencyContracts workspace={data} />
              ) : !isPlatform &&
                ["contacts", "vehicles", "invoices"].includes(section) ? (
                <AgencyManagement
                  key={section}
                  section={section}
                  workspace={data}
                />
              ) : section === "overview" ? (
                <>
                  <div className="page-intro">
                    <div>
                      <div className="eyebrow">
                        {t("A clear view of your business")}
                      </div>
                      <h1>
                        {isPlatform
                          ? t("Your platform, at a glance.")
                          : t("Welcome back, {0}.", {
                              "0": data.session.name.split(" ")[0],
                            })}
                        {t(" ")}
                        {!isPlatform && (
                          <span aria-hidden="true">{t("\u2600")}</span>
                        )}
                      </h1>
                      <p>
                        {isPlatform
                          ? t(
                              "Monitor performance, review partners and keep traveler requests moving.",
                            )
                          : t(
                              "Here’s what’s happening with your journeys today.",
                            )}
                      </p>
                    </div>
                    <div className="row">
                      <Dropdown
                        label={t("Reporting period")}
                        hideLabel
                        className="period-select"
                        value={period}
                        onChange={(e) => setPeriod(+e.target.value)}
                        aria-label={t("Reporting period")}
                      >
                        <option value={7}>{t("Last 7 days")}</option>
                        <option value={30}>{t("Last 30 days")}</option>
                        <option value={90}>{t("Last 90 days")}</option>
                      </Dropdown>
                      <button
                        className="button secondary"
                        onClick={() => {
                          exportBookings(recent, t);
                          setToast(
                            "Your reservation report has been downloaded.",
                          );
                        }}
                      >
                        <Download
                          aria-hidden="true"
                          focusable="false"
                          size={14}
                        />
                        {t("Export report")}
                      </button>
                    </div>
                  </div>
                  {isPlatform && (
                    <section
                      className="operations-queue"
                      aria-label={t("Your work queue")}
                    >
                      <div className="operations-heading">
                        <span className="eyebrow">{t("Your work queue")}</span>
                        <span>{t("Across all dates")}</span>
                      </div>
                      <div className="operations-grid">
                        {[
                          {
                            href: "/platform/bookings?status=requested",
                            icon: BookOpen,
                            count: pending.length,
                            title: "Reservation requests",
                            description:
                              "Check availability and coordinate the next step.",
                          },
                          {
                            href: "/platform/agencies?status=pending",
                            icon: Building2,
                            count: reviewAgencies.length,
                            title: "Partners to review",
                            description:
                              "Verify applications before approving access.",
                          },
                          {
                            href: "/platform/support",
                            icon: Inbox,
                            count: openTickets.length,
                            title: "Open support messages",
                            description:
                              "Help travelers with plans and changes.",
                          },
                        ].map(
                          ({ href, icon: Icon, count, title, description }) => (
                            <Link
                              className={`queue-card ${count ? "has-work" : ""}`}
                              key={href}
                              href={href}
                            >
                              <span className="queue-icon">
                                <Icon
                                  aria-hidden="true"
                                  focusable="false"
                                  size={20}
                                />
                              </span>
                              <div>
                                <strong>
                                  {new Intl.NumberFormat(t.locale).format(
                                    count,
                                  )}
                                  <span>{t(title)}</span>
                                </strong>
                                <p>{t(description)}</p>
                              </div>
                              <ArrowRight
                                aria-hidden="true"
                                focusable="false"
                                size={17}
                              />
                            </Link>
                          ),
                        )}
                      </div>
                    </section>
                  )}
                  <div className="stat-grid">
                    <Stat
                      label={t("Booking value")}
                      value={money(value, t.locale)}
                      icon={CircleDollarSign}
                      foot={t("{0} confirmed or completed trips", {
                        "0": accepted.length,
                      })}
                      trend={t("Scheduled value")}
                    />
                    <Stat
                      label={t("Reservations")}
                      value={String(recent.length)}
                      icon={BookOpen}
                      foot={t("Requested in the last {0} days", {
                        "0": period,
                      })}
                      trend={t("{0} completed", {
                        "0": recent.filter((b) => b.status === "completed")
                          .length,
                      })}
                    />
                    <Stat
                      label={
                        isPlatform
                          ? t("Active agencies")
                          : t("Published listings")
                      }
                      value={String(
                        isPlatform
                          ? activeAgencies.length
                          : listings.filter((l) => l.status === "published")
                              .length,
                      )}
                      icon={isPlatform ? Building2 : CarFront}
                      foot={
                        isPlatform
                          ? t("Verified local partners")
                          : t("Available on your storefront")
                      }
                      trend={t("Live catalog")}
                    />
                    <Stat
                      label={
                        isPlatform
                          ? t("Agency reviews")
                          : t("Requests to review")
                      }
                      value={String(
                        isPlatform
                          ? agencies.filter((a) => a.status === "pending")
                              .length
                          : pending.length,
                      )}
                      icon={Clock3}
                      foot={
                        isPlatform
                          ? t("Awaiting platform approval")
                          : t("Ready for your attention")
                      }
                      trend={t("Action needed")}
                    />
                  </div>
                  <div className="analytics-grid">
                    <RevenueChart bookings={recent} period={period} />
                    <CategoryChart bookings={recent} />
                  </div>
                  <div className="dashboard-lower">
                    <div className="card table-card">
                      <div className="card-head">
                        <div>
                          <h2>{t("Recent reservations")}</h2>
                          <p className="chart-subtitle">
                            {t("The latest journeys coming your way.")}
                          </p>
                        </div>
                        <Link className="text-link" href={`${base}/bookings`}>
                          {t("View all")}
                          <ArrowUpRight
                            aria-hidden="true"
                            focusable="false"
                            size={13}
                          />
                        </Link>
                      </div>
                      <BookingTable
                        bookings={bookings.slice(0, 5)}
                        onSelect={openBooking}
                        compact
                      />
                    </div>
                    <aside className="upcoming-side">
                      <div className="card">
                        <div className="card-head">
                          <h2>{t("Coming up next")}</h2>
                          <CalendarDays
                            aria-hidden="true"
                            focusable="false"
                            size={16}
                            className="muted"
                          />
                        </div>
                        {bookings
                          .filter(
                            (b) =>
                              b.start >= today() &&
                              ["confirmed", "awaiting_payment"].includes(
                                b.status,
                              ),
                          )
                          .sort((a, b) => a.start.localeCompare(b.start))
                          .slice(0, 3)
                          .map((b) => (
                            <div className="upcoming-item" key={b.id}>
                              <div className="date-tile">
                                <small>
                                  {t(
                                    new Date(b.start).toLocaleDateString(
                                      t.tag,
                                      { month: "short", timeZone: "UTC" },
                                    ),
                                  )}
                                </small>
                                <strong>
                                  {new Date(b.start).getUTCDate()}
                                </strong>
                              </div>
                              <div>
                                <h3>{t(b.listingName)}</h3>
                                <p>
                                  {b.name}
                                  {t(" \u00B7 ")}
                                  {t(b.city)}
                                </p>
                                <button
                                  className="text-link"
                                  onClick={() => openBooking(b)}
                                >
                                  {t("View reservation")}
                                  <ArrowUpRight
                                    aria-hidden="true"
                                    focusable="false"
                                    size={11}
                                  />
                                </button>
                              </div>
                            </div>
                          ))}
                        {!bookings.some(
                          (b) =>
                            b.start >= today() &&
                            ["confirmed", "awaiting_payment"].includes(
                              b.status,
                            ),
                        ) && (
                          <div style={{ padding: "1.2rem" }} className="muted">
                            {t("Your next trips will appear here.")}
                          </div>
                        )}
                      </div>
                      <div className="insight-card">
                        <div className="row">
                          <TrendingUp
                            aria-hidden="true"
                            focusable="false"
                            size={18}
                          />
                          <span style={{ fontSize: ".65rem" }}>
                            {t("A little room to grow")}
                          </span>
                        </div>
                        <h3>
                          {isPlatform ? (
                            <>
                              {t("Good partners.")}
                              <br />
                              {t("Great journeys.")}
                            </>
                          ) : (
                            <>
                              {t("More possibilities.")}
                              <br />
                              {t("More good journeys.")}
                            </>
                          )}
                        </h3>
                        <p>
                          {isPlatform
                            ? t(
                                "Review new agencies and help bring more local experiences to the map.",
                              )
                            : t(
                                "Keep your listings up to date so travelers can find their perfect fit.",
                              )}
                        </p>
                        <Link
                          className="button lime"
                          href={`${base}/${isPlatform ? "agencies" : "fleet"}`}
                        >
                          {isPlatform
                            ? t("Review agencies")
                            : t("Manage my listings")}
                          <ArrowUpRight
                            aria-hidden="true"
                            focusable="false"
                            size={13}
                          />
                        </Link>
                      </div>
                    </aside>
                  </div>
                </>
              ) : section === "bookings" ? (
                <>
                  <PageIntro
                    title={t("Every journey, in one place.")}
                    text={t(
                      "Review requests, coordinate the details, and keep things moving.",
                    )}
                  >
                    <button
                      className="button secondary"
                      onClick={() => exportBookings(filtered, t)}
                    >
                      <Download
                        aria-hidden="true"
                        focusable="false"
                        size={14}
                      />
                      {t("Export reservations")}
                    </button>
                  </PageIntro>
                  <div className="card table-card">
                    <div
                      className="tabs"
                      role="tablist"
                      onKeyDown={handleTabKeys}
                      aria-label={t("Reservation status")}
                    >
                      {["all", "requested", "confirmed", "completed"].map(
                        (s) => (
                          <button
                            key={s}
                            role="tab"
                            aria-selected={status === s}
                            tabIndex={
                              status === s ||
                              (s === "all" &&
                                ![
                                  "all",
                                  "requested",
                                  "confirmed",
                                  "completed",
                                ].includes(status))
                                ? 0
                                : -1
                            }
                            id={`${tabsId}-${s}`}
                            aria-controls={`${tabsId}-panel`}
                            className={`tab ${status === s ? "active" : ""}`}
                            onClick={() => setStatus(s)}
                          >
                            {s === "all"
                              ? t("All reservations")
                              : t(statusLabels[s])}
                            <span>
                              {s === "all"
                                ? bookings.length
                                : bookings.filter((b) => b.status === s).length}
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                    <div
                      id={`${tabsId}-panel`}
                      role="tabpanel"
                      aria-label={t(statusLabels[status])}
                    >
                      <div className="table-toolbar">
                        <div className="table-search">
                          <Search
                            aria-hidden="true"
                            focusable="false"
                            size={16}
                          />
                          <input
                            aria-label={t("Search reservations")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t(
                              "Search traveler, reference, or listing…",
                            )}
                          />
                        </div>
                        <Dropdown
                          label={t("Filter by reservation status")}
                          hideLabel
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          aria-label={t("Filter by reservation status")}
                        >
                          {Object.entries(statusLabels).map(([v, label]) => (
                            <option key={v} value={v}>
                              {t(label)}
                            </option>
                          ))}
                        </Dropdown>
                        <span
                          className="muted"
                          style={{ fontSize: ".7rem", marginLeft: "auto" }}
                        >
                          {filtered.length}
                          {t(" reservations")}
                        </span>
                      </div>
                      <BookingTable
                        key={`${status}:${search}`}
                        bookings={filtered}
                        onSelect={openBooking}
                      />
                    </div>
                  </div>
                </>
              ) : ["fleet", "listings"].includes(section) ? (
                <>
                  <PageIntro
                    title={
                      isPlatform
                        ? t("A world of local possibilities.")
                        : t("Your listings. Their next adventure.")
                    }
                    text={t(
                      "Keep your offers clear, current, and ready to explore.",
                    )}
                  >
                    <button
                      className="button"
                      onClick={() => {
                        setActionError("");
                        setEditing("new");
                      }}
                    >
                      <Plus aria-hidden="true" focusable="false" size={16} />
                      {t("Add a listing")}
                    </button>
                  </PageIntro>
                  <div
                    className="table-toolbar"
                    style={{ padding: "0 0 1.5rem" }}
                  >
                    <div className="table-search">
                      <Search aria-hidden="true" focusable="false" size={16} />
                      <input
                        aria-label={t("Search listings")}
                        placeholder={t("Search listings or cities…")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <span className="muted" style={{ fontSize: ".75rem" }}>
                      {t("Showing {0} of {1} listings", {
                        "0": visibleListings.length,
                        "1": listings.length,
                      })}
                    </span>
                    <Dropdown
                      label={t("Listing visibility")}
                      hideLabel
                      aria-label={t("Listing visibility")}
                      value={listingVisibility}
                      onChange={(e) => setListingVisibility(e.target.value)}
                    >
                      <option value="all">{t("All visibility states")}</option>
                      <option value="published">{t("Published")}</option>
                      <option value="archived">{t("Archived")}</option>
                    </Dropdown>
                    <Dropdown
                      label={t("Service category")}
                      hideLabel
                      aria-label={t("Service category")}
                      value={listingCategory}
                      onChange={(e) => setListingCategory(e.target.value)}
                    >
                      <option value="all">{t("All categories")}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {t(c.label)}
                        </option>
                      ))}
                    </Dropdown>
                  </div>
                  {visibleListings.length ? (
                    <div className="listing-grid">
                      {visibleListings.map((l) => (
                        <div className="listing-card" key={l.id}>
                          <div className="listing-photo">
                            <Image
                              src={l.image}
                              unoptimized={l.image.startsWith(
                                "/api/car-images/",
                              )}
                              alt={t(l.name)}
                              fill
                              sizes="(max-width:640px) 90vw, 40vw"
                            />
                            <span className="photo-tag">
                              {t(
                                categories.find((c) => c.id === l.category)
                                  ?.label || "",
                              )}
                            </span>
                          </div>
                          <div className="listing-info">
                            <div className="row between">
                              <h2>{t(l.name)}</h2>
                              <Badge status={l.status} />
                            </div>
                            <div className="location">
                              <MapPin
                                aria-hidden="true"
                                focusable="false"
                                size={12}
                              />
                              {t(l.city)}
                              {t(" \u00B7 ")}
                              {l.seats}
                              {t(" guests")}
                            </div>
                            <div className="listing-bottom">
                              <span className="listing-price">
                                {t(money(l.price, t.locale))}
                                <small>
                                  {t(" ")}
                                  {t("/")}
                                  {t(" ")}
                                  {l.category === "cars"
                                    ? t("day")
                                    : l.category === "activities"
                                      ? t("person")
                                      : t("trip")}
                                </small>
                              </span>
                              <button
                                className="button secondary"
                                onClick={() => {
                                  setActionError("");
                                  setEditing(l);
                                }}
                              >
                                <Pencil
                                  aria-hidden="true"
                                  focusable="false"
                                  size={13}
                                />
                                {t("Edit")}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card">
                      <Empty
                        title={
                          listings.length
                            ? t("No listings match this view")
                            : t("Your next chapter starts here")
                        }
                        description={t(
                          "Add your first listing to welcome travelers to your business.",
                        )}
                      >
                        {listings.length ? (
                          <button
                            className="button secondary"
                            onClick={() => {
                              setSearch("");
                              setListingVisibility("all");
                              setListingCategory("all");
                            }}
                          >
                            {t("Clear filters")}
                          </button>
                        ) : (
                          <button
                            className="button"
                            onClick={() => setEditing("new")}
                          >
                            {t("Create a listing")}
                          </button>
                        )}
                      </Empty>
                    </div>
                  )}
                </>
              ) : section === "agencies" ? (
                <>
                  <PageIntro
                    title={t("Local expertise. Shared possibilities.")}
                    text={t(
                      "Review new partners and keep your agency network in good shape.",
                    )}
                  />
                  <div
                    className="table-toolbar"
                    style={{ padding: "0 0 1.5rem" }}
                  >
                    <div className="table-search">
                      <Search aria-hidden="true" focusable="false" size={16} />
                      <input
                        aria-label={t("Search agencies")}
                        placeholder={t("Search agencies or cities…")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <span className="muted" style={{ fontSize: ".75rem" }}>
                      {activeAgencies.length}
                      {t(" active \u00B7")}
                      {t(" ")}
                      {agencies.filter((a) => a.status === "pending").length}
                      {t(" ")}
                      {t("awaiting review")}
                    </span>
                  </div>
                  {actionError && (
                    <p className="error-note" role="alert">
                      {t(actionError)}
                    </p>
                  )}
                  <div
                    className="network-filters"
                    aria-label={t("Agency status")}
                  >
                    {[
                      {
                        id: "all",
                        label: "All agencies",
                        count: agencies.length,
                      },
                      {
                        id: "pending",
                        label: "Awaiting review",
                        count: reviewAgencies.length,
                      },
                      {
                        id: "active",
                        label: "Active",
                        count: activeAgencies.length,
                      },
                      {
                        id: "suspended",
                        label: "Suspended",
                        count: agencies.filter((a) => a.status === "suspended")
                          .length,
                      },
                    ].map((item) => (
                      <button
                        key={item.id}
                        className={agencyStatus === item.id ? "selected" : ""}
                        aria-pressed={agencyStatus === item.id}
                        onClick={() => filterAgencies(item.id)}
                      >
                        {t(item.label)}
                        <span>{item.count}</span>
                      </button>
                    ))}
                    <Dropdown
                      label={
                        <>
                          <span className="sr-only">{t("Sort agencies")}</span>
                        </>
                      }
                      hideLabel
                      value={agencySort}
                      onChange={(e) => setAgencySort(e.target.value)}
                      aria-label={t("Sort agencies")}
                    >
                      <option value="review">{t("Review queue first")}</option>
                      <option value="name">{t("Name A–Z")}</option>
                    </Dropdown>
                  </div>
                  <p className="filter-summary" role="status">
                    {t("Showing {0} of {1} agencies", {
                      "0": visibleAgencies.length,
                      "1": agencies.length,
                    })}
                  </p>
                  {visibleAgencies.length ? (
                    <div className="agency-grid">
                      {visibleAgencies.map((a) => (
                        <AgencyCard
                          key={a.id}
                          agency={a}
                          listings={listings}
                          bookings={bookings}
                          busy={busy}
                          onAccess={() => {
                            setActionError("");
                            setAccessAgency(a);
                          }}
                          onStatus={async (status) => {
                            if (status === "suspended") {
                              setActionError("");
                              setSuspendAgency(a);
                              return;
                            }
                            await mutate(
                              { action: "agency", id: a.id, status },
                              t(
                                status === "active"
                                  ? "{0} approved."
                                  : "{0} updated.",
                                { "0": a.name },
                              ),
                            );
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="card">
                      <Empty
                        title={t("No agencies match this view")}
                        description={t(
                          "Try a different status or search for another name, email or city.",
                        )}
                      >
                        <button
                          className="button secondary"
                          onClick={() => {
                            setSearch("");
                            filterAgencies("all");
                          }}
                        >
                          <FilterX
                            aria-hidden="true"
                            focusable="false"
                            size={15}
                          />
                          {t("Clear filters")}
                        </button>
                      </Empty>
                    </div>
                  )}
                </>
              ) : section === "calendar" ? (
                <>
                  <PageIntro
                    title={t("The days ahead, a little clearer.")}
                    text={t(
                      "Upcoming pickups and experiences across your reservations.",
                    )}
                  />
                  <Calendar bookings={bookings} onSelect={openBooking} />
                </>
              ) : section === "support" && isPlatform ? (
                <>
                  <PageIntro
                    title={t("A little help goes a long way.")}
                    text={t(
                      "Read traveler messages and track what still needs your attention.",
                    )}
                  />
                  <div className="support-toolbar card">
                    <div
                      className="network-filters"
                      aria-label={t("Support status")}
                    >
                      {[
                        {
                          id: "all",
                          label: "All messages",
                          count: data.tickets.length,
                        },
                        {
                          id: "open",
                          label: "Open",
                          count: openTickets.length,
                        },
                        {
                          id: "resolved",
                          label: "Resolved",
                          count: data.tickets.length - openTickets.length,
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          className={ticketStatus === item.id ? "selected" : ""}
                          aria-pressed={ticketStatus === item.id}
                          onClick={() => setTicketStatus(item.id)}
                        >
                          {t(item.label)}
                          <span>{item.count}</span>
                        </button>
                      ))}
                    </div>
                    <div className="table-search">
                      <Search aria-hidden="true" focusable="false" size={16} />
                      <input
                        aria-label={t("Search support messages")}
                        placeholder={t("Search sender, subject or message…")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  {actionError && (
                    <p className="error-note" role="alert">
                      {t(actionError)}
                    </p>
                  )}
                  <div className="stack">
                    {visibleTickets.map((ticket) => (
                      <div key={ticket.id} className="card ticket-card">
                        <div className="row between wrap">
                          <div>
                            <h2>{t(ticket.subject)}</h2>
                            <small className="muted">
                              {ticket.name}
                              {t(" \u00B7 ")}
                              {t(ticket.email)}
                              {t(" \u00B7")}
                              {t(" ")}
                              {t(dateLabel(ticket.createdAt, t.locale))}
                            </small>
                          </div>
                          <Badge status={ticket.status} />
                        </div>
                        <p>{ticket.message}</p>
                        <div className="row wrap">
                          <a
                            href={`mailto:${ticket.email}?subject=${encodeURIComponent(`Re: ${ticket.subject}`)}`}
                            className="button secondary"
                          >
                            <Mail
                              aria-hidden="true"
                              focusable="false"
                              size={14}
                            />
                            {t("Reply by email")}
                          </a>
                          <button
                            className="button"
                            disabled={busy}
                            onClick={() =>
                              mutate(
                                {
                                  action: "ticket",
                                  id: ticket.id,
                                  status:
                                    ticket.status === "open"
                                      ? "resolved"
                                      : "open",
                                },
                                "Support request updated.",
                              )
                            }
                          >
                            {ticket.status === "open"
                              ? t("Mark resolved")
                              : t("Reopen request")}
                          </button>
                        </div>
                      </div>
                    ))}
                    {!visibleTickets.length && (
                      <div className="card">
                        <Empty
                          title={
                            search || ticketStatus !== "all"
                              ? t("No messages match this view")
                              : t("All quiet for now")
                          }
                          description={t(
                            "New traveler messages will appear here.",
                          )}
                        >
                          <button
                            className="button secondary"
                            onClick={() => {
                              setSearch("");
                              setTicketStatus("all");
                            }}
                          >
                            {t("Clear filters")}
                          </button>
                        </Empty>
                      </div>
                    )}
                  </div>
                </>
              ) : section === "settings" ? (
                <>
                  <PageIntro
                    title={t("Make yourself at home.")}
                    text={t(
                      "Manage the details that keep your workspace running smoothly.",
                    )}
                  />
                  <Settings
                    data={data}
                    busy={busy}
                    error={actionError}
                    onSave={(body) =>
                      mutate(
                        { action: "settings", ...body },
                        "Your settings have been saved.",
                      )
                    }
                  />
                </>
              ) : (
                <Empty
                  title={t("This page took a different turn")}
                  description={t(
                    "Head back to your workspace to find what you need.",
                  )}
                >
                  <Link href={base} className="button">
                    {t("Back to overview")}
                  </Link>
                </Empty>
              )}
            </>
          ) : null}
        </main>
      </div>
      {selected && (
        <Modal
          title={t("Reservation details")}
          onClose={() => setSelected(null)}
        >
          <BookingDetails
            booking={
              data?.bookings.find((b) => b.id === selected.id) || selected
            }
            busy={busy}
            error={actionError}
            onStatus={async (status) => {
              const ok = await mutate(
                { action: "booking", id: selected.id, status },
                "Reservation updated.",
              );
              if (ok) setSelected(null);
            }}
          />
        </Modal>
      )}
      {editing && data && (
        <Modal
          title={editing === "new" ? t("A new possibility") : t("Edit listing")}
          onClose={() => setEditing(null)}
        >
          <ListingEditor
            listing={editing === "new" ? undefined : editing}
            agencies={activeAgencies}
            role={role}
            busy={busy}
            error={actionError}
            onSave={async (body) => {
              if (
                await mutate(
                  { action: "listing", ...body },
                  "Your listing has been saved.",
                )
              )
                setEditing(null);
            }}
          />
        </Modal>
      )}
      {accessAgency && (
        <Modal
          title={t("Manager access \u00B7 {0}", { "0": accessAgency.name })}
          onClose={() => setAccessAgency(null)}
        >
          <AccessForm
            agency={accessAgency}
            busy={busy}
            error={actionError}
            onSave={async (body) => {
              if (
                await mutate(
                  { action: "access", agencyId: accessAgency.id, ...body },
                  "Manager account created. Share the credentials securely.",
                )
              )
                setAccessAgency(null);
            }}
          />
        </Modal>
      )}
      {suspendAgency && (
        <Modal
          title={t("Suspend {0}?", { "0": suspendAgency.name })}
          onClose={() => {
            if (!busy) setSuspendAgency(null);
          }}
        >
          <div className="stack">
            <p>
              {t(
                "This agency will lose workspace access and its listings will be hidden from travelers. Existing reservations remain available to platform staff.",
              )}
            </p>
            <div className="notice">
              {t("{0} listings · {1} reservations", {
                "0": listings.filter((l) => l.agencyId === suspendAgency.id)
                  .length,
                "1": bookings.filter((b) => b.agencyId === suspendAgency.id)
                  .length,
              })}
            </div>
            {actionError && (
              <p role="alert" className="error-note">
                {t(actionError)}
              </p>
            )}
            <div className="row wrap">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setSuspendAgency(null)}
              >
                {t("Keep agency active")}
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={async () => {
                  if (
                    await mutate(
                      {
                        action: "agency",
                        id: suspendAgency.id,
                        status: "suspended",
                      },
                      "Agency suspended.",
                    )
                  )
                    setSuspendAgency(null);
                }}
              >
                {busy ? t("Saving…") : t("Suspend agency")}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {notifications && (
        <Modal
          title={t("Your attention, please")}
          onClose={() => setNotifications(false)}
        >
          <div className="stack">
            {pending.length > 0 && (
              <Link
                href={`${base}/bookings`}
                onClick={() => setNotifications(false)}
                className="notice"
              >
                <strong>
                  {pending.length}
                  {t(" reservation requests")}
                </strong>
                <p>{t("Travelers are waiting for availability review.")}</p>
              </Link>
            )}
            {isPlatform && agencies.some((a) => a.status === "pending") && (
              <Link
                href={`${base}/agencies`}
                onClick={() => setNotifications(false)}
                className="notice"
              >
                <strong>
                  {agencies.filter((a) => a.status === "pending").length}
                  {t(" ")}
                  {t("agencies awaiting review")}
                </strong>
                <p>{t("New local providers are ready to join.")}</p>
              </Link>
            )}
            {isPlatform && openTickets.length > 0 && (
              <Link
                href="/platform/support"
                onClick={() => setNotifications(false)}
                className="notice"
              >
                <strong>
                  {t("Open support messages")} · {openTickets.length}
                </strong>
                <p>{t("Help travelers with plans and changes.")}</p>
              </Link>
            )}
            {!pending.length &&
              (!isPlatform ||
                (!reviewAgencies.length && !openTickets.length)) && (
                <Empty
                  title={t("You’re all caught up")}
                  description={t("New requests and reviews will appear here.")}
                />
              )}
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
