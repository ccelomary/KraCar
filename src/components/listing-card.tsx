"use client";
import { useTranslations } from "@/i18n/provider";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Users, Gauge, ArrowUpRight } from "lucide-react";
import { money } from "@/lib/catalog";
import type { Listing } from "@/lib/types";
export default function ListingCard({
  listing,
  start,
  end,
  returnCity,
}: {
  listing: Listing;
  start?: string;
  end?: string;
  returnCity?: string;
}) {
  const t = useTranslations();
  const unit =
    listing.category === "cars"
      ? "day"
      : listing.category === "activities"
        ? "person"
        : "trip";
  return (
    <Link
      href={`/experiences/${listing.id}?${new URLSearchParams({ ...(start ? { start, end: end || start } : {}), ...(returnCity ? { returnCity } : {}) })}`}
      className="listing-card"
    >
      <div className="listing-photo">
        <Image
          src={listing.image}
          unoptimized={listing.image.startsWith("/api/car-images/")}
          alt=""
          fill
          sizes="(max-width:640px) 50vw, (max-width:1200px) 45vw, 30vw"
        />
        <span className="photo-tag">{t(listing.badge)}</span>
      </div>
      <div className="listing-info">
        <h3>{t(listing.name)}</h3>
        <div className="location">
          <MapPin aria-hidden="true" focusable="false" size={12} />
          {t(listing.city)}
          {t(", Morocco")}
        </div>
        <div className="listing-specs">
          <span>
            <Users aria-hidden="true" focusable="false" size={13} />
            {listing.seats}
            {t(" guests")}
          </span>
          <span>
            <Gauge aria-hidden="true" focusable="false" size={13} />
            {t(listing.transmission)}
          </span>
        </div>
        <div className="listing-bottom">
          <span className="listing-price">
            {t(money(listing.price, t.locale))}{" "}
            <small>
              {t("/ ")}
              {t(unit)}
            </small>
          </span>
          <span className="icon-button" aria-hidden="true">
            <ArrowUpRight aria-hidden="true" focusable="false" size={17} />
          </span>
        </div>
      </div>
    </Link>
  );
}
