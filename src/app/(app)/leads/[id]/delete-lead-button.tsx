"use client";

import { useState, useTransition } from "react";
import { deleteLead } from "../actions";

export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
          if (!confirm("Delete this lead permanently? This cannot be undone.")) return;
          setError(null);
          startTransition(async () => {
            const res = await deleteLead(leadId);
            if (res?.error) setError(res.error);
          });
        }}
        className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 active:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "🗑 Delete this lead"}
      </button>
    </div>
  );
}
