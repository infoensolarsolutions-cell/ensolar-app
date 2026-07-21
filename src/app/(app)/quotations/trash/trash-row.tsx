"use client";

import { useState, useTransition } from "react";
import { restoreQuotation, destroyQuotation } from "../actions";

export function TrashRowActions({
  quotationId,
  isOwner,
}: {
  quotationId: string;
  isOwner: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: (id: string) => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn(quotationId);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="shrink-0 text-right">
      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          onClick={() => run(restoreQuotation)}
          className="rounded-lg border border-brand-green px-3 py-1.5 text-xs font-semibold text-brand-green-dark active:bg-brand-green/5 disabled:opacity-60"
        >
          Restore
        </button>
        {isOwner && (
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this quotation forever? This cannot be undone.")) return;
              run(destroyQuotation);
            }}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 active:bg-red-50 disabled:opacity-60"
          >
            Delete forever
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
