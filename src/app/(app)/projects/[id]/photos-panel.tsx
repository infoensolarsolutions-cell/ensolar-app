"use client";

import { useActionState, useState, useTransition } from "react";
import { uploadProjectPhoto, deleteProjectPhoto } from "../photo-actions";
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
  const [state, formAction, pending] = useActionState(uploadProjectPhoto, null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

      {(error || state?.error) && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error ?? state?.error}
        </p>
      )}

      {canUpload && (
        <form action={formAction} className="mt-3 space-y-2 rounded-lg border border-gray-200 p-3">
          <input type="hidden" name="project_id" value={projectId} />
          <input
            name="photo"
            type="file"
            accept="image/*"
            capture="environment"
            required
            className="w-full text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select name="phase" defaultValue="during" className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
              <option value="before">Before</option>
              <option value="during">During</option>
              <option value="after">After</option>
            </select>
            <input
              name="caption"
              placeholder="Caption (optional)"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>
          <button
            disabled={pending}
            className="w-full rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Uploading…" : "Upload photo"}
          </button>
        </form>
      )}
    </div>
  );
}
