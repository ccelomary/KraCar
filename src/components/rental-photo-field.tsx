"use client";

import { useState } from "react";
import CarPhotoPicker, { type EditableCarPhoto } from "./car-photo-picker";

type RentalPhoto = { src: string; description: string };

export default function RentalPhotoField({
  name,
  initial,
  disabled,
  onBusyChange,
}: {
  name: string;
  initial: RentalPhoto[];
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [photos, setPhotos] = useState<EditableCarPhoto[]>(() =>
    initial.map((photo) => ({
      ...photo,
      id: photo.src,
    })),
  );
  async function uploadPhoto(file: File): Promise<EditableCarPhoto> {
    const body = new FormData();
    body.set("file", file);
    body.set("kind", "vehicle");
    const response = await fetch("/api/rental-media", { method: "POST", body });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error || "The photo could not be uploaded. Please retry.",
      );
    return {
      id: result.id,
      src: result.src,
      description: file.name.replace(/\.[^.]+$/, "").slice(0, 160),
    };
  }
  return (
    <>
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(
          photos.map(({ src, description }) => ({ src, description })),
        )}
      />
      <CarPhotoPicker
        photos={photos}
        onChange={setPhotos}
        agencyId=""
        disabled={disabled}
        onBusyChange={onBusyChange}
        uploadPhoto={uploadPhoto}
      />
    </>
  );
}
