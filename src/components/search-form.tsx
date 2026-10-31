"use client";
import { useTranslations } from "@/i18n/provider";
import { useState, useId } from "react";
import { handleTabKeys } from "./accessibility";
import { useRouter } from "next/navigation";
import { CarFront, Compass, Search } from "lucide-react";
import { categories, cities, today } from "@/lib/catalog";
const icons = { cars: CarFront, activities: Compass };
export default function SearchForm() {
  const t = useTranslations();
  const [category, setCategory] = useState("cars");
  const [city, setCity] = useState("");
  const [returnCity, setReturnCity] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const router = useRouter();
  const tabsId = useId();
  return (
    <div className="search-box">
      <div
        className="service-tabs"
        role="tablist"
        onKeyDown={handleTabKeys}
        aria-label={t("Choose a service")}
      >
        {categories.map((c) => {
          const Icon = icons[c.id];
          return (
            <button
              role="tab"
              aria-selected={category === c.id}
              id={`${tabsId}-${c.id}`}
              aria-controls={`${tabsId}-panel`}
              tabIndex={category === c.id ? 0 : -1}
              key={c.id}
              className={`service-tab ${category === c.id ? "active" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              <Icon aria-hidden="true" focusable="false" size={17} />
              {t(c.label)}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-${category}`}
      >
        <form
          className={`search-fields ${category !== "cars" ? "single-date" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            router.push(
              `/explore?${new URLSearchParams({ category, city, start, end: category === "cars" ? end : start, returnCity: category === "cars" ? returnCity : "" })}`,
            );
          }}
        >
          <label>
            {t("Where are you headed?")}
            <select
              aria-label={t("Destination")}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">{t("Anywhere in Morocco")}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {t(c)}
                </option>
              ))}
            </select>
          </label>
          {category === "cars" && (
            <label>
              {t("Drop-off location")}
              <select
                value={returnCity}
                onChange={(e) => setReturnCity(e.target.value)}
              >
                <option value="">{t("Return to pickup city")}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {t(c)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {category === "cars" ? t("Pickup date") : t("Experience date")}
            <input
              type="date"
              min={today()}
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (end < e.target.value) setEnd("");
              }}
            />
          </label>
          {category === "cars" && (
            <label>
              {category === "cars" ? t("Return date") : t("Until")}
              <input
                type="date"
                min={start || today()}
                disabled={!start}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          )}
          <button className="button large" type="submit">
            <Search aria-hidden="true" focusable="false" size={17} />
            {t("Find my journey")}
          </button>
        </form>
      </div>
    </div>
  );
}
