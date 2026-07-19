"use client";

import { useActionState, useState } from "react";
import { updateLead } from "../actions";
import {
  LEAD_STATUSES,
  LOST_REASONS,
  type LeadStatus,
  type LostReason,
} from "@/lib/crm";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30";

export function LeadEditForm({
  lead,
  staff,
}: {
  lead: {
    id: string;
    status: LeadStatus;
    lost_reason: LostReason | null;
    assigned_to: string | null;
    next_followup_at: string | null;
    notes: string | null;
  };
  staff: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(updateLead, null);
  const [status, setStatus] = useState<string>(lead.status);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-4"
    >
      <input type="hidden" name="lead_id" value={lead.id} />

      <div>
        <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
          Stage
        </label>
        <select
          id="status"
          name="status"
          defaultValue={lead.status}
          onChange={(e) => setStatus(e.target.value)}
          className={inputClass}
        >
          {Object.entries(LEAD_STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {status === "lost" && (
        <div>
          <label htmlFor="lost_reason" className="mb-1 block text-sm font-medium text-gray-700">
            Lost reason *
          </label>
          <select
            id="lost_reason"
            name="lost_reason"
            defaultValue={lead.lost_reason ?? ""}
            required
            className={inputClass}
          >
            <option value="" disabled>
              Choose a reason…
            </option>
            {Object.entries(LOST_REASONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="assigned_to" className="mb-1 block text-sm font-medium text-gray-700">
          Assigned to
        </label>
        <select
          id="assigned_to"
          name="assigned_to"
          defaultValue={lead.assigned_to ?? ""}
          className={inputClass}
        >
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="next_followup_at" className="mb-1 block text-sm font-medium text-gray-700">
          Next follow-up
        </label>
        <input
          id="next_followup_at"
          name="next_followup_at"
          type="date"
          defaultValue={lead.next_followup_at ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={lead.notes ?? ""}
          className={inputClass}
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
      {state?.saved && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-4 py-3.5 text-base font-semibold text-white active:bg-brand-green-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
