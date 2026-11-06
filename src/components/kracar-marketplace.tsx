"use client";
import { useSiteDate } from "./site-date";
import SelectField from "./select-field";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CarFront,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  MapPin,
} from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { fetchJson } from "@/lib/client";
import { mad, rentalInstant } from "@/lib/kracar/time";
import RentalBookingPanel from "./rental-booking-panel";
import RentalDateTimeField from "./rental-date-time-field";
import {
  defaultRentalDateTime,
  keepReturnAfterPickup,
  nextRentalMinute,
} from "@/lib/rental-calendar";
import { contractualFields } from "@/lib/kracar/terms";
import { Modal } from "./ui";
export type RentalCar = {
  id: string;
  agencyId: string;
  name: string;
  city: string;
  category: string;
  transmission: string;
  fuel: string;
  seats: number;
  features: string[];
  dailyRate: number;
  deposit: number;
  images: { src: string; description: string }[];
  conditions: Record<string, string>;
  extras: {
    id: string;
    name: string;
    price: number;
    perDay: boolean;
    max: number;
  }[];
  agency: {
    id: string;
    name: string;
    city: string;
    business: Record<string, string>;
    terms: Record<string, string>;
  };
};
type Catalogue = {
  cars: RentalCar[];
  total: number;
  pages: number;
  agencies: { id: string; name: string }[];
  reviews: { id: string; rating: number; comment: string }[];
};
export const rentalCities = [
  "Casablanca",
  "Marrakech",
  "Rabat",
  "Tangier",
  "Agadir",
  "Khenifra",
];
const day = defaultRentalDateTime;
export function RentalSearch({ compact = false }: { compact?: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const today = useSiteDate();
  const [searchError, setSearchError] = useState("");
  const [pickup, setPickup] = useState(() => day(1, today)),
    [dropoff, setDropoff] = useState(() => day(4, today));
  return (
    <form
      action="/cars"
      className={`kc-search ${compact ? "compact" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        const values = new FormData(e.currentTarget);
        try {
          if (
            new Date(rentalInstant(String(values.get("end")))) <=
            new Date(rentalInstant(String(values.get("start"))))
          ) {
            setSearchError("Return date must be after pickup.");
            return;
          }
        } catch {
          setSearchError("Choose valid rental dates.");
          return;
        }
        setSearchError("");
        router.push(
          `/cars?${new URLSearchParams({ city: String(values.get("city") || ""), start: String(values.get("start")), end: String(values.get("end")) })}`,
        );
      }}
    >
      <SelectField
        label={t("Pickup city")}
        name="city"
        options={[
          { value: "", label: t("All cities") },
          ...rentalCities.map((city) => ({ value: city, label: t(city) })),
        ]}
      />
      <RentalDateTimeField
        label="Pickup date and time"
        name="start"
        value={pickup}
        onChange={(next) => {
          setPickup(next);
          setDropoff((current) => keepReturnAfterPickup(next, current));
          setSearchError("");
        }}
      />
      <RentalDateTimeField
        label="Return date and time"
        name="end"
        value={dropoff}
        min={nextRentalMinute(pickup)}
        rangeStart={pickup}
        onChange={(next) => {
          setDropoff(next);
          setSearchError("");
        }}
      />
      <button className="button" type="submit">
        <CarFront size={19} aria-hidden="true" />
        {t("Find a car")}
      </button>
      {searchError && (
        <p className="error-note kc-search-error" role="alert">
          {t(searchError)}
        </p>
      )}
    </form>
  );
}
export function KraCarHome() {
  const t = useTranslations();
  const [service, setService] = useState<"cars" | "activities">("cars");
  const { data, error, mutate } = useSWR<Catalogue>(
    "/api/rental-cars",
    fetchJson,
  );
  function switchService(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "cars"
        : event.key === "End"
          ? "activities"
          : service === "cars"
            ? "activities"
            : "cars";
    setService(next);
    document
      .getElementById(`${next === "cars" ? "cars" : "activities"}-tab`)
      ?.focus();
  }
  return (
    <div className="market-home">
      <div className="market-intro">
        <section className="market-hero">
          <div className="market-hero-photo">
            <Image
              src="/images/duster.jpg"
              alt={t("A rental car on a road through Morocco")}
              fill
              priority
              sizes="(max-width:700px) 100vw, 75vw"
            />
          </div>
          <div className="market-hero-copy">
            <p className="market-overline">
              <MapPin size={14} aria-hidden="true" />
              {t("Made for your time in Morocco")}
            </p>
            <h1>
              {t("Pick your car.")}
              <br />
              <span>{t("Find your Morocco.")}</span>
            </h1>
            <p className="market-hero-description">
              {t(
                "Car rentals and local experiences, all in one place. Compare the details. Make your own plans.",
              )}
            </p>
            <a className="market-hero-link" href="#find-your-journey">
              {t("Find your next trip")}
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
          <div className="market-photo-note">
            <CarFront size={18} aria-hidden="true" />
            <div>
              <strong>{t("Room for a different route")}</strong>
              <span>{t("Illustrative vehicle photography")}</span>
            </div>
          </div>
        </section>
        <section
          className="market-search"
          id="find-your-journey"
          aria-label={t("Find a car or activity")}
        >
          <div
            className="market-search-tabs"
            role="tablist"
            aria-label={t("Choose a service")}
          >
            <button
              id="cars-tab"
              role="tab"
              tabIndex={service === "cars" ? 0 : -1}
              aria-selected={service === "cars"}
              aria-controls="market-search-content"
              onClick={() => setService("cars")}
              onKeyDown={switchService}
            >
              <CarFront size={19} aria-hidden="true" />
              {t("Car rentals")}
            </button>
            <button
              id="activities-tab"
              role="tab"
              tabIndex={service === "activities" ? 0 : -1}
              aria-selected={service === "activities"}
              aria-controls="market-search-content"
              onClick={() => setService("activities")}
              onKeyDown={switchService}
            >
              <MapPin size={18} aria-hidden="true" />
              {t("Things to do")}
            </button>
            <p>
              <ShieldCheck size={15} aria-hidden="true" />
              {t("Conditions available before you book")}
            </p>
          </div>
          <div
            id="market-search-content"
            role="tabpanel"
            aria-labelledby={service === "cars" ? "cars-tab" : "activities-tab"}
          >
            {service === "cars" ? (
              <RentalSearch />
            ) : (
              <form
                className="kc-search market-activity-search"
                action="/explore"
              >
                <input type="hidden" name="category" value="activities" />
                <SelectField
                  label={t("Your destination")}
                  name="city"
                  options={[
                    { value: "", label: t("All cities") },
                    ...rentalCities.map((city) => ({
                      value: city,
                      label: t(city),
                    })),
                  ]}
                />
                <p>
                  {t(
                    "Surf sessions, city discoveries and a different side of Morocco.",
                  )}
                </p>
                <button className="button">
                  {t("Explore experiences")}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </form>
            )}
          </div>
        </section>
        <div className="market-booking-note">
          <span>{t("Local partners. One place to book.")}</span>
          <p>
            {t(
              "10% advance on the service · 5% platform fee · the balance paid to your partner",
            )}
          </p>
          <Link href="/policies/reservation">
            {t("How booking works")}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <section className="market-container market-fleet">
        <div className="market-section-heading">
          <div>
            <p className="market-label">{t("For the road ahead")}</p>
            <h2>{t("A car that fits your plans.")}</h2>
          </div>
          <Link className="market-link" href="/cars">
            {t("View all cars")}
            <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
        </div>
        <nav
          className="market-car-types"
          aria-label={t("Browse cars by category")}
        >
          <Link href="/cars">{t("All cars")}</Link>
          <Link href="/cars?category=economy">{t("City cars")}</Link>
          <Link href="/cars?category=suv">{t("SUVs")}</Link>
          <Link href="/cars?category=premium">{t("Premium")}</Link>
          <Link href="/cars?transmission=automatic">{t("Automatic")}</Link>
        </nav>
        {error ? (
          <div className="market-catalog-message" role="status">
            <CarFront size={24} aria-hidden="true" />
            <div>
              <h3>
                {t("The car selection is taking a little longer to load.")}
              </h3>
              <p>
                {t(
                  "Retry the search or ask our team for help with your dates.",
                )}
              </p>
            </div>
            <button className="button secondary" onClick={() => void mutate()}>
              {t("Try again")}
            </button>
            <Link className="text-link" href="/support">
              {t("Help & support")}
            </Link>
          </div>
        ) : !data ? (
          <div className="market-loading" aria-label={t("Loading cars")}>
            <div />
            <div />
            <div />
          </div>
        ) : data.cars.length ? (
          <div className="kc-car-grid">
            {data.cars.slice(0, 3).map((car) => (
              <RentalCarCard key={car.id} car={car} />
            ))}
          </div>
        ) : (
          <div className="market-catalog-message">
            <p>{t("No cars match these dates and filters")}</p>
            <Link className="market-link" href="/cars">
              {t("Find a car")}
              <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </section>

      <section className="market-container market-places">
        <div className="market-section-heading">
          <div>
            <p className="market-label">{t("More than the drive")}</p>
            <h2>{t("Make a day of it.")}</h2>
          </div>
          <Link className="market-link" href="/explore?category=activities">
            {t("Explore experiences")}
            <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
        </div>
        <div className="market-place-grid">
          {[
            {
              city: "Marrakech",
              image: "marrakech.jpg",
              text: "The city, beyond the postcard",
            },
            {
              city: "Essaouira",
              image: "essaouira-coast.jpg",
              text: "A slower pace by the Atlantic",
            },
            {
              city: "Agadir",
              image: "surf.jpg",
              text: "A good day starts by the sea",
            },
          ].map((place) => (
            <Link
              key={place.city}
              className="market-place"
              href={`/explore?category=activities&city=${place.city}`}
            >
              <div className="market-place-image">
                <Image
                  src={`/images/${place.image}`}
                  alt={t(place.city)}
                  fill
                  sizes="(max-width:640px) 90vw, 33vw"
                />
                <span>{t("Explore")}</span>
              </div>
              <div className="market-place-caption">
                <div>
                  <h3>{t(place.city)}</h3>
                  <p>{t(place.text)}</p>
                </div>
                <span className="market-circle-arrow">
                  <ArrowUpRight size={20} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="market-container market-payment">
        <div className="market-payment-copy">
          <p className="market-label">{t("Before you confirm")}</p>
          <h2>
            {t("The full price.")}
            <br />
            {t("Already on the table.")}
          </h2>
          <p>
            {t(
              "See your partner’s price, our service fee and what is left to pay before making a commitment.",
            )}
          </p>
          <div className="market-payment-questions">
            <details>
              <summary>{t("What do I pay to confirm?")}</summary>
              <p>
                {t(
                  "After partner approval, the initial payment is a 10% advance on the service plus the 5% platform fee. The remaining 90% of the service price is due to your partner.",
                )}
              </p>
            </details>
            <details>
              <summary>{t("Is the security deposit included?")}</summary>
              <p>
                {t(
                  "The security deposit is separate from the service price and advance. Check your partner’s amount and return conditions on the offer.",
                )}
              </p>
            </details>
            <details>
              <summary>{t("Who provides my service?")}</summary>
              <p>
                {t(
                  "Your chosen partner provides the car or activity. KraCar connects you with the partner and keeps your reservation and documents together.",
                )}
              </p>
            </details>
          </div>
        </div>
        <div className="market-price-card">
          <div className="market-price-card-title">
            <span>{t("An example booking")}</span>
            <span>MAD</span>
          </div>
          <p className="market-example-total">
            <span>{t("Total including service fee")}</span>
            <strong>
              2 100<span> MAD</span>
            </strong>
          </p>
          <dl>
            {[
              ["Partner service price incl. tax", "2 000"],
              ["Platform service fee — 5%", "100"],
            ].map(([label, amount]) => (
              <div key={label}>
                <dt>{t(label)}</dt>
                <dd>{amount}</dd>
              </div>
            ))}
          </dl>
          <div className="market-price-due">
            <div>
              <span>{t("Due to confirm your booking")}</span>
              <strong>300 MAD</strong>
            </div>
            <p>{t("10% advance + 5% platform fee")}</p>
          </div>
          <dl>
            <div>
              <dt>{t("Remaining rental balance")}</dt>
              <dd>1 800 MAD</dd>
            </div>
          </dl>
          <p className="market-example-disclaimer">
            {t(
              "Illustration for a 2,000 MAD service. The security deposit is separate.",
            )}
          </p>
        </div>
      </section>

      <section className="market-container market-partner">
        <div>
          <p className="market-label">
            {t("For rental and tourism professionals")}
          </p>
          <h2>{t("Your business. A wider audience.")}</h2>
          <p>
            {t(
              "Publish your offers and manage your clients, reservations and documents from one workspace.",
            )}
          </p>
        </div>
        <div className="market-partner-actions">
          <Link className="button" href="/partners">
            {t("Become a partner")}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <Link className="market-link" href="/login">
            {t("Partner sign in")}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function RentalCarCard({
  car,
  query = "",
  children,
}: {
  car: RentalCar;
  query?: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations();
  return (
    <article className="kc-car-card">
      <Link href={`/cars/${car.id}${query}`}>
        <div className="kc-card-photo">
          <Image
            src={car.images[0]?.src || "/images/duster.jpg"}
            alt={car.images[0]?.description || car.name}
            fill
            unoptimized
            sizes="(max-width:640px) 90vw,30vw"
          />
          <span className="badge active">{t(car.category)}</span>
        </div>
        <div className="kc-car-content">
          <p className="eyebrow">{car.agency.name}</p>
          <h3>{car.name}</h3>
          <p className="location">
            <MapPin size={14} aria-hidden="true" />
            {t(car.city)}
          </p>
          <p className="muted">
            {t(car.transmission)} · {t(car.fuel)} · {car.seats} {t("seats")}
          </p>
          <div className="kc-card-price">
            <strong>{mad(car.dailyRate, t.tag)}</strong>
            <span>{t("per day")}</span>
            <ArrowRight size={20} aria-hidden="true" />
          </div>
          <p className="kc-field-help">
            {t("A 5% platform fee is added to the rental price.")}
          </p>
          <span className="kc-card-action">
            {t("View price and conditions")}{" "}
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        </div>
      </Link>
      {children}
    </article>
  );
}
export function RentalCatalogue() {
  const t = useTranslations(),
    params = useSearchParams();
  const today = useSiteDate();
  const [filter, setFilter] = useState({
    city: params.get("city") || "",
    category: params.get("category") || "",
    transmission: params.get("transmission") || "",
    fuel: "",
    agency: "",
    features: "",
    seats: "1",
    max: "200000",
    start: params.get("start") || day(1, today),
    end: params.get("end") || day(4, today),
  });
  const [page, setPage] = useState(1),
    [comparison, setComparison] = useState<RentalCar[]>([]),
    [compareOpen, setCompareOpen] = useState(false);
  let dateError = "",
    start = "",
    end = "";
  try {
    start = rentalInstant(filter.start);
    end = rentalInstant(filter.end);
    if (end <= start) dateError = "Return date must be after pickup.";
  } catch {
    dateError = "Choose valid rental times in Africa/Casablanca.";
  }
  const query = new URLSearchParams({
    ...filter,
    start,
    end,
    page: String(page),
  });
  const { data, error, mutate, isLoading } = useSWR<Catalogue>(
    dateError ? null : `/api/rental-cars?${query}`,
    fetchJson,
    { keepPreviousData: true },
  );
  function field(key: keyof typeof filter, value: string) {
    setFilter({ ...filter, [key]: value });
    setPage(1);
  }
  const detailQuery = `?${new URLSearchParams({ start: filter.start, end: filter.end })}`;
  return (
    <div className="public-container kc-section">
      <span className="eyebrow">{t("KraCar rental marketplace")}</span>
      <h1>{t("Find your next rental car")}</h1>
      <p className="muted">
        {t("Prices in MAD. Rental times in Africa/Casablanca.")}
      </p>
      <div className="kc-catalog-layout">
        <aside className="card kc-filters" aria-label={t("Filter cars")}>
          <h2>{t("Filter cars")}</h2>
          <SelectField
            label={t("Pickup city")}
            value={filter.city}
            onChange={(value) => field("city", value)}
            options={[
              { value: "", label: t("All cities") },
              ...rentalCities.map((city) => ({ value: city, label: t(city) })),
            ]}
          />
          <RentalDateTimeField
            label="Pickup date and time"
            value={filter.start}
            onChange={(next) => {
              setFilter((current) => ({
                ...current,
                start: next,
                end: keepReturnAfterPickup(next, current.end),
              }));
              setPage(1);
            }}
          />
          <RentalDateTimeField
            label="Return date and time"
            value={filter.end}
            min={nextRentalMinute(filter.start)}
            rangeStart={filter.start}
            onChange={(next) => field("end", next)}
          />
          {(
            [
              ["category", ["economy", "compact", "suv", "premium", "van"]],
              ["transmission", ["manual", "automatic"]],
              ["fuel", ["diesel", "petrol", "hybrid", "electric"]],
            ] as const
          ).map(([key, values]) => (
            <SelectField
              key={key}
              label={t(key)}
              value={filter[key]}
              onChange={(value) => field(key, value)}
              options={[
                { value: "", label: t("All") },
                ...values.map((value) => ({ value, label: t(value) })),
              ]}
            />
          ))}
          <SelectField
            label={t("Agency")}
            value={filter.agency}
            onChange={(value) => field("agency", value)}
            options={[
              { value: "", label: t("All agencies") },
              ...(data?.agencies ?? []).map((agency) => ({
                value: agency.id,
                label: agency.name,
              })),
            ]}
          />
          <label>
            {t("Maximum daily price in MAD")}
            <input
              type="number"
              min="1"
              max="100000"
              value={Number(filter.max) / 100}
              onChange={(e) =>
                field("max", String(Number(e.target.value) * 100))
              }
            />
          </label>
          <label>
            {t("Minimum seats")}
            <input
              type="number"
              min="1"
              max="9"
              value={filter.seats}
              onChange={(e) => field("seats", e.target.value)}
            />
          </label>
          <SelectField
            label={t("Features")}
            value={filter.features}
            onChange={(value) => field("features", value)}
            options={[
              { value: "", label: t("All") },
              ...["air_conditioning", "bluetooth", "usb", "gps"].map(
                (value) => ({ value, label: t(value) }),
              ),
            ]}
          />
        </aside>
        <section aria-label={t("Car results")} aria-busy={isLoading}>
          <div className="row between wrap">
            <p role="status">
              {dateError
                ? t(dateError)
                : data
                  ? `${data.total} ${t("cars found")}`
                  : t("Loading cars")}
            </p>
            {comparison.length > 0 && (
              <button
                className="button secondary"
                onClick={() => setCompareOpen(true)}
              >
                {t("Compare cars")} ({comparison.length}/3)
              </button>
            )}
          </div>
          {error ? (
            <div role="alert">
              <p>
                {t(
                  "The car catalogue is temporarily unavailable. Please retry.",
                )}
              </p>
              <button
                onClick={() => void mutate()}
                className="button secondary"
              >
                {t("Try again")}
              </button>
            </div>
          ) : dateError ? (
            <div className="empty">
              <h2>{t("Check your dates to see available cars")}</h2>
              <p>{t(dateError)}</p>
            </div>
          ) : !data ? (
            <div className="skeleton" />
          ) : data.cars.length === 0 ? (
            <div className="empty">
              <CarFront aria-hidden="true" />
              <h2>{t("No cars match these dates and filters")}</h2>
              <p>{t("Try another city, date range or price.")}</p>
              <button
                className="button secondary"
                onClick={() => {
                  setFilter((current) => ({
                    ...current,
                    city: "",
                    category: "",
                    transmission: "",
                    fuel: "",
                    agency: "",
                    features: "",
                    seats: "1",
                    max: "10000000",
                  }));
                  setPage(1);
                }}
              >
                {t("Clear filters and keep my dates")}
              </button>
            </div>
          ) : (
            <div className="kc-car-grid results">
              {data.cars.map((c) => (
                <RentalCarCard key={c.id} car={c} query={detailQuery}>
                  <label className="kc-compare-check">
                    <input
                      type="checkbox"
                      checked={comparison.some((x) => x.id === c.id)}
                      disabled={
                        comparison.length === 3 &&
                        !comparison.some((x) => x.id === c.id)
                      }
                      onChange={(e) =>
                        setComparison(
                          e.target.checked
                            ? [...comparison, c]
                            : comparison.filter((x) => x.id !== c.id),
                        )
                      }
                    />
                    {t("Compare")} {c.name}
                  </label>
                </RentalCarCard>
              ))}
            </div>
          )}
          {data && data.pages > 1 && (
            <nav className="kc-pagination" aria-label={t("Results pages")}>
              <button
                className="button secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                {t("Previous")}
              </button>
              <span>
                {page} / {data.pages}
              </span>
              <button
                className="button secondary"
                disabled={page >= data.pages}
                onClick={() => setPage(page + 1)}
              >
                {t("Next")}
              </button>
            </nav>
          )}
        </section>
      </div>
      {compareOpen && (
        <Modal title={t("Compare cars")} onClose={() => setCompareOpen(false)}>
          <div className="kc-table-scroll">
            <table>
              <caption>{t("Rental car comparison")}</caption>
              <thead>
                <tr>
                  <th>{t("Vehicle")}</th>
                  {comparison.map((c) => (
                    <th key={c.id}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["dailyRate", "deposit", "transmission", "fuel", "seats"].map(
                  (key) => (
                    <tr key={key}>
                      <th>{t(key)}</th>
                      {comparison.map((c) => (
                        <td key={c.id}>
                          {["dailyRate", "deposit"].includes(key)
                            ? mad(c[key as "dailyRate"], t.tag)
                            : t(String(c[key as "transmission"]))}
                        </td>
                      ))}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function RentalDetail({ id }: { id: string }) {
  const t = useTranslations();
  const [photo, setPhoto] = useState(0);
  const {
    data,
    error: loadError,
    mutate,
  } = useSWR<Catalogue>(
    `/api/rental-cars?id=${encodeURIComponent(id)}`,
    fetchJson,
  );
  const car = data?.cars[0];
  if (loadError)
    return (
      <div className="public-container kc-section" role="alert">
        <h1>{t("This car cannot be loaded right now")}</h1>
        <p>{t("Try again or ask our team to help you find a vehicle.")}</p>
        <div className="row">
          <button className="button" onClick={() => void mutate()}>
            {t("Try again")}
          </button>
          <Link className="button secondary" href="/support">
            {t("Help & support")}
          </Link>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="public-container kc-section">
        <div className="skeleton" />
      </div>
    );
  if (!car)
    return (
      <div className="public-container kc-section">
        <h1>{t("Car unavailable")}</h1>
        <Link href="/cars">{t("View all cars")}</Link>
      </div>
    );
  return (
    <div className="public-container kc-section">
      <Link href="/cars" className="text-link">
        ← {t("All cars")}
      </Link>
      <p className="eyebrow">
        {car.agency.name} · {t(car.city)}
      </p>
      <h1>{car.name}</h1>
      <a className="button kc-mobile-request-link" href="#rental-request">
        {t("Choose dates and see the price")}{" "}
        <ArrowRight size={16} aria-hidden="true" />
      </a>
      <div className="kc-detail-layout">
        <div>
          <div className="kc-detail-photo">
            <Image
              src={car.images[photo]?.src || "/images/duster.jpg"}
              alt={car.images[photo]?.description || car.name}
              fill
              priority
              unoptimized
              sizes="(max-width:800px) 90vw,60vw"
            />
          </div>
          <div
            className="car-gallery-thumbnails"
            role="group"
            aria-label={t("Car photo gallery")}
          >
            {car.images.map((img, i) => (
              <button
                key={i}
                className={photo === i ? "selected" : ""}
                aria-label={t("View photo {0}", { "0": i + 1 })}
                aria-pressed={photo === i}
                onClick={() => setPhoto(i)}
              >
                <Image
                  src={img.src}
                  alt=""
                  width={120}
                  height={80}
                  unoptimized
                />
              </button>
            ))}
          </div>
          <div className="kc-specs">
            {[
              car.category,
              car.transmission,
              car.fuel,
              `${car.seats} ${t("seats")}`,
              ...car.features,
            ].map((s, i) => (
              <span className="badge" key={i}>
                {t(s)}
              </span>
            ))}
          </div>
          <section className="kc-detail-section" id="partner-conditions">
            <h2>{t("Rental conditions")}</h2>
            <p className="notice">
              {t(
                "KraCar connects you with this partner. The partner provides the service and issues its invoice. Contact support for changes or complaints.",
              )}{" "}
              <Link href="/support">{t("Help & support")}</Link>
            </p>
            <div className="kc-partner-terms">
              {Object.entries(car.agency.terms || {})
                .filter(
                  ([key, value]) =>
                    !key.startsWith("_") &&
                    value &&
                    (!["fr", "ar", "en"].includes(key) ||
                      key ===
                        (car.agency.terms[t.locale]
                          ? t.locale
                          : car.agency.terms.fr
                            ? "fr"
                            : "ar")),
                )
                .map(([key, value]) => (
                  <div key={key}>
                    <h3>
                      {t(
                        ["fr", "ar", "en"].includes(key)
                          ? "Partner conditions"
                          : contractualFields.find(
                              ([field]) => field === key,
                            )?.[1] || key,
                      )}
                    </h3>
                    <p style={{ whiteSpace: "pre-wrap" }}>{value}</p>
                  </div>
                ))}
            </div>
            <dl className="management-details">
              {Object.entries(car.conditions)
                .filter(([key]) => key !== "taxBps")
                .map(([key, val]) => (
                  <div key={key}>
                    <dt>
                      {t(
                        contractualFields.find(
                          ([field]) => field === key,
                        )?.[1] || key,
                      )}
                    </dt>
                    <dd>{val}</dd>
                  </div>
                ))}
            </dl>
            <a href="#rental-request" className="text-link">
              {t("Return to my request")}
            </a>
          </section>
          <section className="kc-detail-section">
            <h2>{t("Your rental agency")}</h2>
            <h3>{car.agency.name}</h3>
            <p>{car.agency.business.address}</p>
            <p className="muted">{t("Verified agency")}</p>
          </section>
          <section className="kc-detail-section">
            <h2>{t("Reviews from completed rentals")}</h2>
            {data.reviews.length ? (
              data.reviews.map((r) => (
                <article className="card" key={r.id}>
                  <strong>{r.rating}/5</strong>
                  <p>{r.comment}</p>
                </article>
              ))
            ) : (
              <p className="muted">
                {t(
                  "No reviews yet. Only customers with completed rentals can leave a review.",
                )}
              </p>
            )}
          </section>
        </div>
        <RentalBookingPanel car={car} />
      </div>
    </div>
  );
}
