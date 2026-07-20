"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createTicket } from "../ticket-actions";
import { formatDate } from "@/lib/format";

export type TicketRow = {
  id: string;
  ticket_no: string;
  problem: string;
  status: "open" | "in_progress" | "resolved";
  warranty: boolean;
  reported_at: string;
  assignee_name: string | null;
};

export const TICKET_BADGE = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-800",
};

export const TICKET_LABEL = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export function TicketsPanel({
  projectId,
  tickets,
  technicians,
  isStaff,
}: {
  projectId: string;
  tickets: TicketRow[];
  technicians: { id: string; name: string }[];
  isStaff: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, pending] = useActionState(createTicket, null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 font-semibold text-gray-900">After-sales tickets</p>

      {tickets.length === 0 && (
        <p className="text-sm text-gray-500">No service tickets for this project.</p>
      )}
      <ul className="divide-y divide-gray-100">
        {tickets.map((t) => (
          <li key={t.id}>
            <Link href={`/tickets/${t.id}`} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {t.ticket_no}
                  {!t.warranty && (
                    <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">billable</span>
                  )}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {formatDate(t.reported_at)} · {t.problem}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${TICKET_BADGE[t.status]}`}>
                {TICKET_LABEL[t.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {isStaff && (
        <div className="mt-3">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full rounded-lg border border-brand-green px-4 py-2.5 text-sm font-semibold text-brand-green-dark active:bg-brand-green/5"
            >
              + New service ticket
            </button>
          ) : (
            <form action={formAction} className="space-y-2 rounded-lg border border-gray-200 p-3">
              <input type="hidden" name="project_id" value={projectId} />
              <textarea
                name="problem"
                rows={2}
                required
                placeholder="Reported problem…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <select name="assigned_to" className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm" defaultValue="">
                  <option value="">Unassigned</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <select name="warranty" className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm" defaultValue="true">
                  <option value="true">Warranty (free)</option>
                  <option value="false">Billable</option>
                </select>
              </div>
              {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
              <div className="flex gap-2">
                <button disabled={pending} className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {pending ? "Creating…" : "Create ticket"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
