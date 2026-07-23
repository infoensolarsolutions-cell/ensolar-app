"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerProjectPhotos, deleteProjectPhoto } from "../photo-actions";
import { createClient } from "@/lib/supabase/client";
import { downscaleImage } from "@/lib/image";
import { formatDate } from "@/lib/format";

export type PhotoRow = {
  id: string;
  url: string;
  caption: string | null;
  phase: "before" | "during" | "after";
  created_at: string;
  uploader_name: string | null;
};

const PHASES = { before: "Before", during: "During", after: "After" };

export function PhotosPanel({
  projectId,
  photos,
  canUpload,
  isStaff,
}: {
  projectId: string;
  photos: PhotoRow[];
  canUpload: boolean;
  isStaff: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const phaseRef = useRef<HTMLSelectElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);

  async function uploadPhotos() {
    const files = Array.from(fileRef.current?.files ?? []);
    if (!files.length) {
      setError("Choose photos first — tap the file button above.");
      return;
    }
    if (files.length > 10) {
      setError("Maximum 10 photos per upload.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const uploadedPaths: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${files.length}…`);
        const blob = await downscaleImage(files[i]);
        const path = `projects/${projectId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("project-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw new Error(upErr.message);
        uploadedPaths.push(path);
      }
      setProgress("Saving…");
      const res = await registerProjectPhotos(
        projectId,
        phaseRef.current?.value ?? "during",
        captionRef.current?.value ?? "",
        uploadedPaths,
      );
      if (res?.error) throw new Error(res.error);
      if (fileRef.current) fileRef.current.value = "";
      if (captionRef.current) captionRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(
        `Upload failed after ${uploadedPaths.length} of ${files.length} photos: ${
          e instanceof Error ? e.message : "unknown error"
        }`,
      );
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 font-semibold text-gray-900">Site photos</p>

      {photos.length === 0 && (
        <p className="text-sm text-gray-500">No photos yet.</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <figure key={p.id} className="relative">
            <a href={p.url} target="_blank">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? PHASES[p.phase]}
                className="aspect-square w-full rounded-lg object-cover"
                loading="lazy"
              />
            </a>
            <figcaption className="mt-0.5 truncate text-[10px] text-gray-500">
              {PHASES[p.phase]}
              {p.caption && ` · ${p.caption}`}
              {` · ${formatDate(p.created_at)}`}
            </figcaption>
            {isStaff && (
              <button
                onClick={() =>
                  startTransition(async () => {
                    const res = await deleteProjectPhoto(p.id, projectId);
                    if (res.error) setError(res.error);
                  })
                }
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs font-bold text-white"
                aria-label="Delete photo"
              >
                ×
              </button>
            )}
          </figure>
        ))}
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {canUpload && (
        <div className="mt-3 space-y-2 rounded-lg border border-gray-200 p-3">
          {/* No `capture` attribute: the phone offers Camera OR Photo Gallery. */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="w-full text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select ref={phaseRef} defaultValue="during" className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
              <option value="before">Before</option>
              <option value="during">During</option>
              <option value="after">After</option>
            </select>
            <input
              ref={captionRef}
              placeholder="Caption (optional)"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>
          <button
            onClick={uploadPhotos}
            disabled={pending}
            className="w-full rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? progress ?? "Uploading…" : "Upload photo(s)"}
          </button>
        </div>
      )}
    </div>
  );
}
