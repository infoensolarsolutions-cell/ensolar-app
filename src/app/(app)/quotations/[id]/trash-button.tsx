"use client";

import { useState, useTransition } from "react";
import { trashQuotation, restoreQuotation } from "../actions";

export function TrashButton({
  quotationId,
  deleted,
}: {
  quotationId: string;
  deleted: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (deleted) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">
          🗑 This quotation is in the Recycle Bin.
        </p>
        {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
        <button
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await restoreQuotation(quotationId);
              if (res?.error) setError(res.error);
            });
          }}
          className="mt-2 rounded-lg border border-brand-green px-4 py-2 text-sm font-semibold text-brand-green-dark active:bg-brand-green/5 disabled:opacity-60"
        >
          {pending ? "Restoring…" : "Restore quotation"}
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={pending}
        onClick={() => {
          if (!confirm("Move this quotation to the Recycle Bin?")) return;
          setError(null);
          startTransition(async () => {
            const res = await trashQuotation(quotationId);
            if (res?.error) setError(res.error);
          });
        }}
        className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 active:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Moving…" : "🗑 Move to Recycle Bin"}
      </button>
    </div>
  );
}
