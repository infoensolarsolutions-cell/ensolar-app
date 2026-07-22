"use client";

import { useActionState, useState } from "react";
import { updateProjectData } from "../actions";
import { SERVICE_TYPES } from "@/lib/crm";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export function EditProjectForm({
  projectId,
  serviceType,
  contractAmount,
}: {
  projectId: string;
  serviceType: string | null;
  contractAmount: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateProjectData, null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 active:bg-gray-50"
      >
        ✏️ Edit project details
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      <input type="hidden" name="project_id" value={projectId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Service type</label>
          <select name="service_type" defaultValue={serviceType ?? ""} className={inputClass}>
            <option value="">—</option>
            {Object.entries(SERVICE_TYPES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Contract amount ₱</label>
          <input
            name="contract_amount"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            defaultValue={contractAmount}
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Changing the contract amount is recorded in the Timeline. Payment
        milestones are not adjusted automatically — review them after saving.
      </p>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}
      {state?.saved && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">Saved.</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 active:bg-gray-50"
        >
          Close
        </button>
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
