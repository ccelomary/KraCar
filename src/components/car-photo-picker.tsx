"use client";
import { useId, useState } from "react";
import Image from "next/image";
import { useTranslations } from "@/i18n/provider";
import {
  maxCarPhotos,
  photoLimit,
  photoMimeTypes,
  type CarPhoto,
} from "@/lib/car-photos";

export type EditableCarPhoto = Pick<CarPhoto, "id" | "src" | "description">;

export default function CarPhotoPicker<
  Photo extends EditableCarPhoto = CarPhoto,
>({
  photos,
  onChange,
  agencyId,
  disabled,
  onBusyChange,
  uploadPhoto,
}: {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  agencyId: string;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  uploadPhoto?: (file: File) => Promise<Photo>;
}) {
  const t = useTranslations(),
    id = useId(),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const locked = disabled || uploading;
  async function upload(files: File[]) {
    setError("");
    if (!files.length) return;
    if (photos.length + files.length > maxCarPhotos) {
      setError("You can add up to six car photos.");
      return;
    }
    if (
      files.some(
        (f) =>
          !photoMimeTypes.includes(f.type) || !f.size || f.size > photoLimit,
      )
    ) {
      setError("Choose a JPEG, PNG or WebP photo no larger than 5 MB.");
      return;
    }
    setUploading(true);
    onBusyChange(true);
    const next = [...photos];
    try {
      for (const file of files) {
        if (uploadPhoto) {
          next.push(await uploadPhoto(file));
          onChange([...next]);
          continue;
        }
        const form = new FormData();
        form.set("photo", file);
        form.set("agencyId", agencyId);
        const response = await fetch("/api/car-images", {
            method: "POST",
            body: form,
          }),
          value = await response.json();
        if (!response.ok) throw new Error(value.error);
        next.push(value);
        onChange([...next]);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The photo could not be uploaded. Please retry.",
      );
    } finally {
      setUploading(false);
      onBusyChange(false);
    }
  }
  return (
    <fieldset
      className="car-photo-picker"
      disabled={locked}
      aria-busy={uploading}
    >
      <legend>{t("Car photos")}</legend>
      <p id={`${id}-help`} className="muted">
        {t(
          "Add up to six JPEG, PNG or WebP photos, 5 MB each. The first photo is the cover.",
        )}
      </p>
      <label className="car-photo-upload">
        {t("Add car photos")}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={
            locked ||
            photos.length >= maxCarPhotos ||
            (!agencyId && !uploadPhoto)
          }
          aria-describedby={`${id}-help`}
          onChange={(e) => {
            const files = Array.from(e.currentTarget.files || []);
            e.currentTarget.value = "";
            void upload(files);
          }}
        />
      </label>
      <p className="muted" role="status" aria-live="polite">
        {uploading
          ? t("Uploading photos…")
          : t("{0} car photos selected", { "0": photos.length })}
      </p>
      {error && (
        <p className="error-note" role="alert">
          {t(error)}
        </p>
      )}
      <div className="car-photo-grid">
        {photos.map((photo, index) => (
          <div className="car-photo-tile" key={photo.id}>
            <div className="car-photo-preview">
              <Image
                src={photo.src}
                alt={
                  photo.description || t("Car photo {0}", { "0": index + 1 })
                }
                fill
                unoptimized
                sizes="(max-width:640px) 80vw, 260px"
              />
              {index === 0 && (
                <span className="badge active">{t("Cover photo")}</span>
              )}
            </div>
            <label>
              {t("Photo description {0}", { "0": index + 1 })}
              <input
                maxLength={160}
                value={photo.description}
                onChange={(e) =>
                  onChange(
                    photos.map((p) =>
                      p.id === photo.id
                        ? { ...p, description: e.target.value }
                        : p,
                    ),
                  )
                }
              />
            </label>
            <div className="row wrap">
              {index > 0 && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    onChange([
                      photo,
                      ...photos.filter((p) => p.id !== photo.id),
                    ])
                  }
                >
                  {t("Use as cover")}
                </button>
              )}
              <button
                type="button"
                className="button ghost"
                aria-label={t("Remove photo {0}", { "0": index + 1 })}
                onClick={() =>
                  onChange(photos.filter((p) => p.id !== photo.id))
                }
              >
                {t("Remove")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
