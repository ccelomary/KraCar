"use client";
import { useId, useState } from "react";
import Image from "next/image";
import { useTranslations } from "@/i18n/provider";
import type { CarPhoto } from "@/lib/car-photos";
export default function CarPhotoGallery({
  photos,
  name,
}: {
  photos: CarPhoto[];
  name: string;
}) {
  const t = useTranslations(),
    [selected, setSelected] = useState(0),
    id = useId(),
    current = photos[selected] || photos[0];
  return (
    <div className="rental-photo-gallery">
      <div className="detail-image">
        <Image
          src={current.src}
          alt={
            current.description ||
            t("{0}, car photo {1}", { "0": name, "1": selected + 1 })
          }
          fill
          priority
          unoptimized
          sizes="90vw"
        />
      </div>
      <div
        className="car-gallery-thumbnails"
        role="group"
        aria-label={t("Car photo gallery")}
      >
        {photos.map((p, index) => (
          <button
            type="button"
            key={p.id}
            className={selected === index ? "selected" : ""}
            aria-pressed={selected === index}
            aria-label={t("View photo {0}", { "0": index + 1 })}
            aria-describedby={id}
            onClick={() => setSelected(index)}
          >
            <Image src={p.src} alt="" width={120} height={80} unoptimized />
          </button>
        ))}
      </div>
      <p className="muted" role="status" id={id}>
        {t("Photo {0} of {1}", { "0": selected + 1, "1": photos.length })}
        {current.description ? ` · ${current.description}` : ""}
      </p>
    </div>
  );
}
