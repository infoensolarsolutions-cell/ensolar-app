"use client";

import { useActionState, useState } from "react";
import { SERVICE_TYPES } from "@/lib/crm";
import { addPastProject } from "./actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export function AddPastProjectForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addPastProject, null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-600 active:bg-gray-50"
      >
        ＋ Park a past completed project (2018 onwards)
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 lg:max-w-md">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-900">Park a past project</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 underline">
          close
        </button>
      </div>
      <p className="text-xs text-gray-500">
        For installations finished before the app existed — recorded straight
        into the archive as completed.
      </p>
      <input name="customer_name" placeholder="Customer / project name *" required className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <select name="service_type" required defaultValue="" className={inputClass}>
          <option value="" disabled>Category *</option>
          {Object.entries(SERVICE_TYPES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input
          name="completed_date" type="date" required
          min="2018-01-01" className={inputClass}
        />
      </div>
      <input name="site_address" placeholder="Site location (optional)" className={inputClass} />
      <input
        name="contract_amount" type="number" min="0" step="any" inputMode="decimal"
        placeholder="Contract amount ₱ (optional)" className={inputClass}
      />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}
      {state?.saved && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          ✓ Parked in the archive.
        </p>
      )}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Park as completed"}
      </button>
    </form>
  );
}
