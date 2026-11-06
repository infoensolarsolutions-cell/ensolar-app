"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { registerProjectFiles, deleteProjectFile } from "../file-actions";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";

export type ProjectFileRow = {
  id: string;
  url: string;
  title: string;
  mime: string | null;
  size_kb: number | null;
  created_at: string;
  uploader_name: string | null;
};

const MAX_MB = 15;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];

function icon(mime: string | null): string {
  if (mime === "application/pdf") return "📄";
  if (mime?.startsWith("image/")) return "🖼️";
  return "📎";
}

// Digital filing cabinet: scanned, signed copies of each project's paperwork
// (contracts, permits, certificates) kept beside the generated documents.
export function FilesPanel({
  projectId,
  files,
  canUpload,
  isStaff,
}: {
  projectId: string;
  files: ProjectFileRow[];
  canUpload: boolean;
  isStaff: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  async function uploadFiles() {
    const picked = Array.from(fileRef.current?.files ?? []);
    if (!picked.length) {
      setError("Choose the scanned file(s) first — PDF or photo.");
      return;
    }
    if (picked.length > 10) {
      setError("Maximum 10 files per upload.");
      return;
    }
    for (const f of picked) {
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`"${f.name}" is over ${MAX_MB}MB — scan at a lower resolution.`);
        return;
      }
      if (f.type && !ALLOWED.includes(f.type)) {
        setError(`"${f.name}" is not a PDF or image.`);
        return;
      }
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const uploaded: { path: string; title: string; mime: string; sizeKb: number }[] = [];
    try {
      const baseTitle = (titleRef.current?.value ?? "").trim();
      for (let i = 0; i < picked.length; i++) {
        setProgress(`Uploading file ${i + 1} of ${picked.length}…`);
        const f = picked[i];
        const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase().slice(0, 6) : "bin";
        const path = `projects/${projectId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("project-files")
          .upload(path, f, { contentType: f.type || "application/octet-stream" });
        if (upErr) throw new Error(upErr.message);
        uploaded.push({
          path,
          title: baseTitle
            ? picked.length > 1 ? `${baseTitle} (${i + 1})` : baseTitle
            : f.name.replace(/\.[^.]+$/, ""),
          mime: f.type || "application/octet-stream",
          sizeKb: Math.round(f.size / 1024),
        });
      }
      setProgress("Saving…");
      const res = await registerProjectFiles(projectId, uploaded);
      if (res?.error) throw new Error(res.error);
      if (fileRef.current) fileRef.current.value = "";
      if (titleRef.current) titleRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(
        `Upload failed after ${uploaded.length} of ${picked.length} files: ${
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
      <p className="text-sm font-bold text-gray-800">🗄️ Scanned Documents</p>
      <p className="mt-0.5 text-xs text-gray-500">
        Soft copies of the signed / filled-up paperwork (contracts, permits,
        certificates) — PDF or photo, up to {MAX_MB}MB each.
      </p>

      {canUpload && (
        <div className="mt-3 space-y-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="application/pdf,image/*"
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-green/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-green-dark"
          />
          <input
            ref={titleRef}
            placeholder='Document name, e.g. "Signed IA-2026-0021" (optional)'
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none"
          />
          <button
            disabled={pending}
            onClick={uploadFiles}
            className="w-full rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? progress ?? "Uploading…" : "⬆️ Upload scanned document(s)"}
          </button>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
          )}
        </div>
      )}

      {files.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 py-2.5">
              <span className="text-lg">{icon(f.mime)}</span>
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-semibold text-brand-green-dark underline">
                  {f.title}
                </p>
                <p className="text-[11px] text-gray-400">
                  {formatDate(f.created_at)}
                  {f.size_kb !== null && ` · ${f.size_kb >= 1024 ? `${(f.size_kb / 1024).toFixed(1)}MB` : `${f.size_kb}KB`}`}
                  {f.uploader_name && ` · by ${f.uploader_name}`}
                </p>
              </a>
              {isStaff && (
                <button
                  onClick={async () => {
                    if (!confirm(`Delete "${f.title}"?`)) return;
                    setError(null);
                    const res = await deleteProjectFile(f.id, projectId);
                    if (res.error) setError(res.error);
                    else router.refresh();
                  }}
                  className="shrink-0 text-xs text-gray-400 underline"
                >
                  delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!files.length && !canUpload && (
        <p className="mt-3 text-sm text-gray-400">No scanned documents yet.</p>
      )}
    </div>
  );
}
