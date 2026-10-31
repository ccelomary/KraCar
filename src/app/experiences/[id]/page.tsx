import { getTranslator } from "@/i18n/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import CarPhotoGallery from "@/components/car-photo-gallery";
import Link from "next/link";
import {
  MapPin,
  Users,
  Gauge,
  Fuel,
  Check,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import PublicShell from "@/components/public-shell";
import BookingForm from "@/components/booking-form";
import { categories } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { clean } from "@/lib/api";
import type { Listing } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Detail({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const t = await getTranslator();
  const { id } = await params;
  const db = await getDb();
  const listing = await db.collection<Listing>("listings").findOne({
    id,
    status: "published",
    category: { $in: categories.map((c) => c.id) },
  });
  if (
    !listing ||
    !(await db
      .collection("agencies")
      .findOne({ id: listing.agencyId, status: "active" }))
  )
    notFound();
  return (
    <PublicShell>
      <main tabIndex={-1} id="main-content" className="public-container">
        <div className="detail-top">
          <div className="breadcrumb">
            <Link href="/explore">{t("Explore")}</Link>
            <ChevronRight aria-hidden="true" focusable="false" size={12} />
            <Link href={`/explore?city=${listing.city}`}>
              {t(listing.city)}
            </Link>
            <ChevronRight aria-hidden="true" focusable="false" size={12} />
            <span>{t(listing.name)}</span>
          </div>
          <h1>{t(listing.name)}</h1>
          <div className="row muted">
            <MapPin aria-hidden="true" focusable="false" size={15} />
            {t(listing.city)}
            {t(", Morocco ")}
            <span>{t("\u00B7")}</span>
            <span>{t(listing.badge)}</span>
          </div>
          {listing.photos?.length ? (
            <CarPhotoGallery photos={listing.photos} name={listing.name} />
          ) : (
            <div className="detail-hero">
              <Image
                src={listing.image}
                alt={t("Illustrative {0} photograph", {
                  "0": t(
                    listing.category === "cars" ? "vehicle" : "experience",
                  ),
                })}
                fill
                priority
                sizes="90vw"
              />
              <span>
                {t(
                  "Illustrative photography \u00B7 Exact details reviewed with your provider",
                )}
              </span>
            </div>
          )}
        </div>
        <div className="booking-layout">
          <section>
            <div className="detail-specs">
              <div>
                <Users aria-hidden="true" focusable="false" size={22} />
                <strong>
                  {t("Up to ")}
                  {listing.seats}
                  {t(" guests")}
                </strong>
              </div>
              <div>
                <Gauge aria-hidden="true" focusable="false" size={22} />
                <strong>{t(listing.transmission)}</strong>
              </div>
              <div>
                <Fuel aria-hidden="true" focusable="false" size={22} />
                <strong>{t(listing.fuel)}</strong>
              </div>
            </div>
            <h2 style={{ marginBottom: "1rem" }}>
              {t("A little more about your journey")}
            </h2>
            <p className="detail-copy">{t(listing.description)}</p>
            <div className="detail-section">
              <h2>{t("Good to know")}</h2>
              {[
                "Local provider coordination",
                "Clear pricing before you send a request",
                "Support with pickup and trip arrangements",
                listing.category === "cars"
                  ? "A valid driving licence is required"
                  : "Availability and conditions confirmed by the operator",
              ].map((item) => (
                <div className="included-item" key={item}>
                  <Check aria-hidden="true" focusable="false" size={16} />
                  {t(item)}
                </div>
              ))}
            </div>
            <div className="detail-section">
              <h2>{t("Know where you stand")}</h2>
              <div className="included-item">
                <ShieldCheck aria-hidden="true" focusable="false" size={18} />
                {t("Your request is reviewed before any payment.")}
              </div>
              <p className="detail-copy">
                {t(
                  "Your provider checks availability and the trip details. An approved request is not a confirmed booking. No card details are collected here.",
                )}
              </p>
              <div className="row wrap" style={{ marginTop: "1rem" }}>
                <Link className="text-link" href="/policies/terms">
                  {t("Booking conditions")}
                </Link>
                <Link className="text-link" href="/policies/cancellation">
                  {t("Changes & cancellations")}
                </Link>
              </div>
            </div>
          </section>
          <BookingForm listing={clean(listing)} />
        </div>
      </main>
    </PublicShell>
  );
}
