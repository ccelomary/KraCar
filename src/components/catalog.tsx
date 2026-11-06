"use client";
import SelectField from "./select-field";
import { useTranslations } from "@/i18n/provider";
import { matchesSearch } from "@/i18n/search";
import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetchJson } from "@/lib/client";
import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal, RotateCcw, Search } from "lucide-react";
import { categories, cities } from "@/lib/catalog";
import type { Listing } from "@/lib/types";
import ListingCard from "./listing-card";
import { Empty } from "./ui";
export default function Catalog() {
  const t = useTranslations();
  const params = useSearchParams(),
    router = useRouter();
  const category =
    params.get("category") === "activities" ? "activities" : "cars";
  const initialCity = params.get("city") || "";
  const {
    data: listings = [],
    isLoading: loading,
    error: loadError,
    mutate: load,
  } = useSWR<Listing[]>("/api/catalog", fetchJson);
  const error = loadError?.message || "";
  const [cityOverride, setCity] = useState<string | null>(null),
    [transmission, setTransmission] = useState<string[]>([]),
    [fuel, setFuel] = useState<string[]>([]),
    [maxPrice, setMaxPrice] = useState(300),
    [sort, setSort] = useState("recommended"),
    [filterOpen, setFilterOpen] = useState(false),
    [query, setQuery] = useState("");
  const city = cityOverride ?? initialCity;
  const filtered = useMemo(
    () =>
      listings
        .filter(
          (l) =>
            l.category === category &&
            (!city || l.city === city) &&
            l.price <= maxPrice * 100 &&
            (!transmission.length || transmission.includes(l.transmission)) &&
            (!fuel.length || fuel.includes(l.fuel)) &&
            matchesSearch(query, [l.name, t(l.name)], t.locale),
        )
        .sort((a, b) =>
          sort === "low"
            ? a.price - b.price
            : sort === "high"
              ? b.price - a.price
              : 0,
        ),
    [listings, category, city, maxPrice, transmission, fuel, sort, query, t],
  );
  function toggle(
    value: string,
    list: string[],
    setter: (x: string[]) => void,
  ) {
    setter(
      list.includes(value) ? list.filter((x) => x !== value) : [...list, value],
    );
  }
  function reset() {
    setCity("");
    setTransmission([]);
    setFuel([]);
    setMaxPrice(300);
    setSort("recommended");
    setQuery("");
  }
  return (
    <>
      <section className="catalog-heading">
        <div className="public-container">
          <div className="eyebrow">{t("Make room for a little adventure")}</div>
          <h1>
            {category === "cars"
              ? t("Your road. Your rhythm.")
              : t("Good days, locally made.")}
          </h1>
          <p className="muted">
            {t(
              "Thoughtful options from local providers. Find the one that fits your journey.",
            )}
          </p>
          <div
            className="service-tabs"
            style={{ marginTop: "1.5rem", marginBottom: 0 }}
          >
            {categories.map((c) => (
              <button
                key={c.id}
                className={`service-tab ${category === c.id ? "active" : ""}`}
                onClick={() => {
                  reset();
                  router.push(`/explore?category=${c.id}`);
                }}
              >
                {t(c.label)}
              </button>
            ))}
          </div>
        </div>
      </section>
      <div className="public-container">
        <div className="catalog-layout">
          <button
            className="button secondary filter-toggle"
            onClick={() => setFilterOpen(!filterOpen)}
            aria-expanded={filterOpen}
          >
            <SlidersHorizontal aria-hidden="true" focusable="false" size={15} />
            {t("Refine your search")}
          </button>
          <aside
            className={`filters ${filterOpen ? "open" : ""}`}
            aria-label={t("Search filters")}
          >
            <div className="row between">
              <h2>{t("Make it yours")}</h2>
              <button
                className="button ghost"
                onClick={reset}
                aria-label={t("Reset filters")}
              >
                <RotateCcw aria-hidden="true" focusable="false" size={14} />
              </button>
            </div>
            <div className="filter-group">
              <SelectField
                label={t("Destination")}
                value={city}
                onChange={setCity}
                options={[
                  { value: "", label: t("All destinations") },
                  ...cities.map((city) => ({ value: city, label: t(city) })),
                ]}
              />
            </div>
            <div className="filter-group">
              <label>
                {t("Maximum price: \u20AC")}
                {maxPrice}
                <input
                  type="range"
                  min="20"
                  max="300"
                  step="5"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(+e.target.value)}
                  aria-label={t("Maximum price in euros")}
                />
              </label>
              <small className="muted">
                {t("Per")}
                {t(" ")}
                {category === "cars"
                  ? t("day")
                  : category === "activities"
                    ? t("person")
                    : t("trip")}
              </small>
            </div>
            {category === "cars" && (
              <>
                <div className="filter-group">
                  <h3>{t("Transmission")}</h3>
                  {["Automatic", "Manual"].map((v) => (
                    <label className="filter-checkbox" key={v}>
                      <input
                        type="checkbox"
                        checked={transmission.includes(v)}
                        onChange={() =>
                          toggle(v, transmission, setTransmission)
                        }
                      />
                      {t(v)}
                    </label>
                  ))}
                </div>
                <div className="filter-group">
                  <h3>{t("Fuel")}</h3>
                  {["Diesel", "Petrol"].map((v) => (
                    <label className="filter-checkbox" key={v}>
                      <input
                        type="checkbox"
                        checked={fuel.includes(v)}
                        onChange={() => toggle(v, fuel, setFuel)}
                      />
                      {t(v)}
                    </label>
                  ))}
                </div>
              </>
            )}
            <div className="notice">
              {t(
                "Availability is reviewed by the provider after you send a request. No payment is taken now.",
              )}
            </div>
          </aside>
          <section>
            <h2 className="sr-only">{t("Search results")}</h2>
            <div className="result-toolbar">
              <span role="status" aria-live="polite" aria-atomic="true">
                <strong>{filtered.length}</strong>
                {t(" ")}
                {category === "cars" ? t("cars") : t("experiences")}
                {t(" to make your own")}
                {t(" ")}
                {city && t("in {0}", { "0": t(city) })}
              </span>
              <SelectField
                label={t("Sort listings")}
                compact
                value={sort}
                onChange={setSort}
                options={[
                  { value: "recommended", label: t("Recommended") },
                  { value: "low", label: t("Price: low to high") },
                  { value: "high", label: t("Price: high to low") },
                ]}
              />
            </div>
            <div className="table-search" style={{ marginBottom: "1rem" }}>
              <Search aria-hidden="true" focusable="false" size={16} />
              <input
                aria-label={t("Search listings by name")}
                value={query}
                placeholder={t("Looking for something specific?")}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {loading ? (
              <div className="result-grid">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="skeleton"
                    style={{ height: "21rem" }}
                  />
                ))}
              </div>
            ) : error ? (
              <Empty title={t("A small detour")} description={error}>
                <button className="button" onClick={() => void load()}>
                  {t("Try again")}
                </button>
              </Empty>
            ) : filtered.length ? (
              <div className="result-grid">
                {filtered.map((l) => (
                  <ListingCard
                    listing={l}
                    key={l.id}
                    start={params.get("start") || undefined}
                    end={params.get("end") || undefined}
                    returnCity={params.get("returnCity") || undefined}
                  />
                ))}
              </div>
            ) : (
              <Empty
                title={t("No matches this time")}
                description={t(
                  "Try another city or give your filters a little more room.",
                )}
              >
                <button className="button secondary" onClick={reset}>
                  {t("Clear filters")}
                </button>
              </Empty>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
