"use client";

import { useState, useTransition } from "react";
import { expireLapsedQuotations } from "./actions";

export function ExpireLapsedButton({ lapsedCount }: { lapsedCount: number }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (lapsedCount === 0 && !message) return null;

  return (
    <div className="mt-2 border-t border-amber-100 pt-2">
      {lapsedCount > 0 && (
        <button
          disabled={pending}
          onClick={() => {
            if (
              !confirm(
                `Mark ${lapsedCount} lapsed quotation${lapsedCount === 1 ? "" : "s"} as Expired?\n\nThey stay on record and count as lost in your win-rate statistics — nothing is deleted. A quotation can still be reopened by editing it later.`,
              )
            )
              return;
            setError(null);
            startTransition(async () => {
              const res = await expireLapsedQuotations();
              if (res.error) setError(res.error);
              else setMessage(`✓ ${res.expired} quotation${res.expired === 1 ? "" : "s"} marked Expired.`);
            });
          }}
          className="w-full rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900 active:bg-amber-100 disabled:opacity-60"
        >
          {pending
            ? "Marking…"
            : `⏱ Mark all ${lapsedCount} lapsed as Expired (keeps records & stats honest)`}
        </button>
      )}
      {message && (
        <p className="mt-1 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">{message}</p>
      )}
      {error && (
        <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}
