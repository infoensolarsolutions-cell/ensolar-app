"use client";

import { useActionState } from "react";
import { updateTicket } from "@/app/(app)/projects/ticket-actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export function TicketForm({
  ticket,
  technicians,
  isStaff,
}: {
  ticket: {
    id: string;
    status: "open" | "in_progress" | "resolved";
    diagnosis: string | null;
    action_taken: string | null;
    assigned_to: string | null;
    warranty: boolean;
  };
  technicians: { id: string; name: string }[];
  isStaff: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateTicket, null);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <input type="hidden" name="ticket_id" value={ticket.id} />

      <div>
        <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">Status</label>
        <select id="status" name="status" defaultValue={ticket.status} className={inputClass}>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {isStaff && (
        <>
          <div>
            <label htmlFor="assigned_to" className="mb-1 block text-sm font-medium text-gray-700">Assigned to</label>
            <select id="assigned_to" name="assigned_to" defaultValue={ticket.assigned_to ?? ""} className={inputClass}>
              <option value="">Unassigned</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="warranty" className="mb-1 block text-sm font-medium text-gray-700">Coverage</label>
            <select id="warranty" name="warranty" defaultValue={String(ticket.warranty)} className={inputClass}>
              <option value="true">Warranty (free)</option>
              <option value="false">Billable — record the payment on the project</option>
            </select>
          </div>
        </>
      )}

      <div>
        <label htmlFor="diagnosis" className="mb-1 block text-sm font-medium text-gray-700">Diagnosis</label>
        <textarea id="diagnosis" name="diagnosis" rows={2} defaultValue={ticket.diagnosis ?? ""} className={inputClass} />
      </div>

      <div>
        <label htmlFor="action_taken" className="mb-1 block text-sm font-medium text-gray-700">
          Action taken <span className="text-xs text-gray-400">(required to resolve)</span>
        </label>
        <textarea id="action_taken" name="action_taken" rows={2} defaultValue={ticket.action_taken ?? ""} className={inputClass} />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}
      {state?.saved && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">Saved.</p>
      )}

      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-4 py-3 text-sm font-semibold text-white active:bg-brand-green-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save ticket"}
      </button>
    </form>
  );
}
