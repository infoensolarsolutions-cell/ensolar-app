"use client";

import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import { deleteMySignature, saveMySignature } from "./actions";

export function SignatureForm({ current }: { current: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveMySignature, null);
  const [error, setError] = useState<string | null>(null);
  const [removing, startTransition] = useTransition();

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="text-sm font-medium text-brand-green-dark underline"
        >
          ✍️ E-signature for documents {open ? "▾" : "▸"}
        </button>
        {current && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
            on file
          </span>
        )}
      </div>

      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-gray-200 p-3">
          {current && (
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              {/* data URI preview of the stored signature */}
              <Image src={current} alt="Current signature" width={160} height={60} unoptimized className="mx-auto h-14 w-auto object-contain" />
            </div>
          )}
          <form action={formAction} className="space-y-2">
            <input
              name="signature"
              type="file"
              accept="image/png,image/jpeg"
              required
              className="w-full text-sm"
            />
            <p className="text-[11px] leading-snug text-gray-400">
              Sign on white paper with a dark pen, photograph or scan it,
              crop tightly around the signature, and upload (PNG/JPG, max
              1 MB). It appears above your name on quotations and receipts
              you prepared. Stored privately — never on a public link.
            </p>
            {(state?.error || error) && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {state?.error ?? error}
              </p>
            )}
            {state?.saved && !state.error && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                Signature saved — it now appears on documents you prepare.
              </p>
            )}
            <div className="flex gap-2">
              <button
                disabled={pending}
                className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Saving…" : current ? "Replace signature" : "Save signature"}
              </button>
              {current && (
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => {
                    if (!confirm("Remove your e-signature from generated documents?")) return;
                    setError(null);
                    startTransition(async () => {
                      const res = await deleteMySignature();
                      if (res.error) setError(res.error);
                    });
                  }}
                  className="rounded-lg border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-60"
                >
                  Remove
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
