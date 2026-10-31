import { getTranslator } from "@/i18n/server";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  MapPin,
  Headphones,
  Wallet,
} from "lucide-react";
import PublicShell from "@/components/public-shell";
import SearchForm from "@/components/search-form";
import ListingCard from "@/components/listing-card";
import { ArrowLink } from "@/components/ui";
import { getDb, demoMode } from "@/lib/db";
import { clean } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { categories, cities } from "@/lib/catalog";
import { faqGroups } from "@/lib/public-content";
import { guides } from "@/lib/travel-guides";
import GuideCard from "@/components/guide-card";
export const dynamic = "force-dynamic";
export default async function Home() {
  const t = await getTranslator();
  const db = await getDb();
  const active = (
    await db.collection("agencies").find({ status: "active" }).toArray()
  ).map((a) => a.id);
  const listings = clean(
    (
      await Promise.all(
        categories.map((category) =>
          db
            .collection<Listing>("listings")
            .find({
              status: "published",
              category: category.id,
              agencyId: { $in: active },
            })
            .limit(4)
            .toArray(),
        ),
      )
    ).flat(),
  );
  return (
    <PublicShell>
      <main tabIndex={-1} id="main-content">
        <section className="hero">
          <div className="hero-image">
            <Image
              src="/images/atlas-road.jpg"
              alt={t("Winding road through the Moroccan Atlas Mountains")}
              fill
              priority
              sizes="100vw"
            />
          </div>
          <div className="hero-content">
            <span className="eyebrow">
              {t("A little closer to the real Morocco")}
            </span>
            <h1>
              {t("Good journeys")} {t("start with ")}
              <em>{t("freedom.")}</em>
            </h1>
            <p>
              {t(
                "Find your rental car. Plan your route. Discover local things to do along the way. Morocco is yours to explore.",
              )}
            </p>
            <div className="hero-caption">
              <MapPin aria-hidden="true" focusable="false" size={13} />
              {t("The Atlas Mountains, Morocco")}
            </div>
          </div>
        </section>
        <div className="search-container">
          <SearchForm />
        </div>
        <div className="public-container">
          <div className="trust-row">
            <span>
              <ShieldCheck aria-hidden="true" focusable="false" size={19} />
              {t("Clear conditions, before you book")}
            </span>
            <span>
              <MapPin aria-hidden="true" focusable="false" size={19} />
              {t("Connected to local providers")}
            </span>
            <span>
              <Wallet aria-hidden="true" focusable="false" size={19} />
              {t("Transparent, itemized prices")}
            </span>
            <span>
              <Headphones aria-hidden="true" focusable="false" size={19} />
              {t("A team to help along the way")}
            </span>
          </div>
          {demoMode() && (
            <div className="demo-strip" style={{ marginTop: "1rem" }}>
              <span />
              {t(
                "Preview with sample listings and agencies. Reservations are requests, with no payment collected.",
              )}
            </div>
          )}
          <section className="public-section travel-benefits">
            <div className="section-title">
              <h2>{t("Morocco, with less to worry about")}</h2>
              <p>
                {t(
                  "One place to plan the road, the coast and everything in between.",
                )}
              </p>
            </div>
            <div className="partner-benefits">
              {[
                {
                  icon: ShieldCheck,
                  title: "Know what you’re booking",
                  text: "Compare the details, inclusions and conditions before making a request.",
                },
                {
                  icon: MapPin,
                  title: "Local people, local knowledge",
                  text: "Discover services from providers who know the places you want to explore.",
                },
                {
                  icon: Headphones,
                  title: "Help along the way",
                  text: "Keep your trip details together and contact our team when you need support.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <article key={title}>
                  <span className="feature-icon">
                    <Icon aria-hidden="true" focusable="false" size={24} />
                  </span>
                  <h3>{t(title)}</h3>
                  <p>{t(text)}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="public-section">
            <div className="section-head">
              <div>
                <div className="eyebrow">{t("Your keys to the country")}</div>
                <h2>{t("For wherever the road goes.")}</h2>
                <p>
                  {t("A city runaround or a little more room for adventure.")}
                </p>
              </div>
              <ArrowLink href="/explore?category=cars">
                {t("Explore all cars")}
              </ArrowLink>
            </div>
            {listings.some((l) => l.category === "cars") ? (
              <div className="public-listings">
                {listings
                  .filter((l) => l.category === "cars")
                  .slice(0, 4)
                  .map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
              </div>
            ) : (
              <p className="notice">
                {t(
                  "Our catalog is being prepared. Check back soon for local experiences.",
                )}
              </p>
            )}
          </section>
          {categories
            .filter(
              (c) =>
                c.id !== "cars" && listings.some((l) => l.category === c.id),
            )
            .map((c) => (
              <section className="public-section" key={c.id}>
                <div className="section-head">
                  <div>
                    <div className="eyebrow">{t("Explore Morocco")}</div>
                    <h2>{t(c.label)}</h2>
                  </div>
                  <ArrowLink href={`/explore?category=${c.id}`}>
                    {t("Explore all")}
                  </ArrowLink>
                </div>
                <div className="public-listings">
                  {listings
                    .filter((l) => l.category === c.id)
                    .slice(0, 4)
                    .map((l) => (
                      <ListingCard key={l.id} listing={l} />
                    ))}
                </div>
              </section>
            ))}
          <section className="public-section destination-directory">
            <h2>{t("Choose your destination")}</h2>
            <div className="city-links">
              {cities.map((city) => (
                <Link
                  key={city}
                  href={`/explore?city=${encodeURIComponent(city)}`}
                >
                  <MapPin aria-hidden="true" focusable="false" size={15} />
                  {t(city)}
                  <ArrowUpRight
                    aria-hidden="true"
                    focusable="false"
                    size={14}
                  />
                </Link>
              ))}
            </div>
          </section>
          <section className="public-section">
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  {t("Same country. So many worlds.")}
                </div>
                <h2>{t("Follow your curiosity.")}</h2>
              </div>
              <ArrowLink href="/explore">{t("Find your place")}</ArrowLink>
            </div>
            <div className="destination-grid">
              {[
                {
                  city: "Marrakech",
                  caption: "Medinas, mountains & a little magic",
                  image: "marrakech",
                },
                {
                  city: "Agadir",
                  caption: "Salt air. Slower days.",
                  image: "surf",
                },
                {
                  city: "Essaouira",
                  caption: "A fresh perspective",
                  image: "essaouira-coast",
                },
              ].map((d) => (
                <Link
                  className="destination-card"
                  key={d.city}
                  href={`/explore?city=${d.city}`}
                >
                  <Image
                    src={`/images/${d.image}.jpg`}
                    alt={t(d.city)}
                    fill
                    sizes="(max-width:640px) 90vw, 40vw"
                  />
                  <div className="destination-text">
                    <div>
                      <small>{t(d.caption)}</small>
                      <h3>{t(d.city)}</h3>
                    </div>
                    <ArrowUpRight
                      aria-hidden="true"
                      focusable="false"
                      size={23}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>
          <section className="public-section">
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  {t("Less planning. More being there.")}
                </div>
                <h2>{t("Your trip, made simple.")}</h2>
              </div>
            </div>
            <div className="how-grid">
              {[
                {
                  n: "01",
                  title: "Find your kind of journey",
                  text: "Browse local options, compare the details, and choose what feels right for your trip.",
                },
                {
                  n: "02",
                  title: "Make it yours",
                  text: "Pick your dates, add the details, and send a request. Your local provider reviews availability.",
                },
                {
                  n: "03",
                  title: "Let the good days begin",
                  text: "Once availability is approved, our team coordinates the next steps with you.",
                },
              ].map((s) => (
                <div className="how-card" key={s.n}>
                  <span>{t(s.n)}</span>
                  <h3>{t(s.title)}</h3>
                  <p>{t(s.text)}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="public-section">
            <div className="section-head">
              <div>
                <div className="eyebrow">{t("A little inspiration")}</div>
                <h2>{t("Atlas travel notes")}</h2>
              </div>
              <ArrowLink href="/blog">{t("Explore all")}</ArrowLink>
            </div>
            <div className="guide-grid">
              {guides.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </section>
          <section className="partner-banner">
            <div>
              <span className="eyebrow">
                {t("Built with local businesses")}
              </span>
              <h2>
                {t("You know Morocco.")}
                <br />
                {t("Let\u2019s show it to the world.")}
              </h2>
              <p>
                {t(
                  "Bring your cars, experiences, and local know-how. We\u2019ll give you one place to manage requests and reach new travelers.",
                )}
              </p>
              <Link href="/partners" className="button lime">
                {t("Grow with Atlas ")}
                <ArrowUpRight aria-hidden="true" focusable="false" size={16} />
              </Link>
            </div>
            <Image
              src="/images/marrakech.jpg"
              width={700}
              height={500}
              alt={t("Warm architecture in Marrakech")}
            />
          </section>
          <section className="public-section faq-section">
            <div className="section-title">
              <h2>{t("A few things you might be wondering")}</h2>
              <p>{t("Clear answers before you make your plans.")}</p>
            </div>
            {faqGroups[0].items.map((item) => (
              <details key={item.question}>
                <summary>{t(item.question)}</summary>
                <p>{t(item.answer)}</p>
              </details>
            ))}
            <Link href="/faq" className="text-link">
              {t("See all questions")}
              <ArrowUpRight aria-hidden="true" focusable="false" size={15} />
            </Link>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
