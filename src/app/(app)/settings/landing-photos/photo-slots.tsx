"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SLOTS = [
  { name: "hero.jpg", label: "Hero background", hint: "Wide photo behind the big headline", maxW: 1800 },
  { name: "work1.jpg", label: "Our Work — photo 1", hint: "First photo in the gallery row", maxW: 1200 },
  { name: "work2.jpg", label: "Our Work — photo 2", hint: "Second photo in the gallery row", maxW: 1200 },
  { name: "work3.jpg", label: "Our Work — photo 3", hint: "Third photo in the gallery row", maxW: 1200 },
] as const;

// Downscale on the phone before uploading so the landing page stays fast.
async function resizeImage(file: File, maxW: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not process the image."))),
      "image/jpeg",
      0.82,
    ),
  );
}

export function PhotoSlots({
  baseUrl,
  existing,
}: {
  baseUrl: string;
  existing: Record<string, string>; // slot name -> updated_at (cache buster)
}) {
  const [versions, setVersions] = useState<Record<string, string>>(existing);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(slot: (typeof SLOTS)[number], file: File) {
    setBusy(slot.name);
    setError(null);
    try {
      const blob = await resizeImage(file, slot.maxW);
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("landing")
        .upload(slot.name, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw new Error(upErr.message);
      setVersions((v) => ({ ...v, [slot.name]: String(Date.now()) }));
    } catch (e) {
      setError(
        `Could not upload: ${e instanceof Error ? e.message : "unknown error"}. ` +
          "Make sure the latest database migration has been run.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 lg:col-span-full">{error}</p>
      )}
      {SLOTS.map((slot) => {
        const v = versions[slot.name];
        return (
          <div key={slot.name} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="font-semibold text-gray-900">{slot.label}</p>
            <p className="text-xs text-gray-500">{slot.hint}</p>
            {v ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${baseUrl}/${slot.name}?v=${encodeURIComponent(v)}`}
                alt={slot.label}
                className="mt-3 h-40 w-full rounded-lg object-cover"
              />
            ) : (
              <p className="mt-3 rounded-lg bg-gray-50 px-3 py-6 text-center text-sm text-gray-400">
                No photo yet — a stock photo is shown on the landing page.
              </p>
            )}
            <label className="mt-3 block">
              <span className="block w-full cursor-pointer rounded-lg border border-brand-green px-4 py-2.5 text-center text-sm font-semibold text-brand-green-dark active:bg-brand-green/5">
                {busy === slot.name ? "Uploading…" : v ? "Replace photo" : "Upload photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(slot, f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
