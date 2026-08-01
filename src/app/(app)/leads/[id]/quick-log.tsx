"use client";

import { useState, useTransition } from "react";
import { logLeadActivity } from "../actions";

const btnClass =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-60";

export function QuickLog({ leadId }: { leadId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function log(kind: "no_answer" | "talked" | "followup_3d" | "note", noteText?: string) {
    setError(null);
    startTransition(async () => {
      const res = await logLeadActivity(leadId, kind, noteText);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-1.5">
        <button disabled={pending} onClick={() => log("no_answer")} className={btnClass}>
          📵 No answer (retry tomorrow)
        </button>
        <button disabled={pending} onClick={() => log("talked")} className={btnClass}>
          📞 Talked
        </button>
        <button disabled={pending} onClick={() => log("followup_3d")} className={btnClass}>
          🔁 Follow up in 3 days
        </button>
        <button
          disabled={pending}
          onClick={() => {
            const text = prompt("Add a note to the activity log:");
            if (text?.trim()) log("note", text);
          }}
          className={btnClass}
        >
          ✍️ Note…
        </button>
      </div>
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}
