"use client";

import { useActionState, useState, useTransition } from "react";
import { addLeave, deleteLeave } from "../attendance-admin-actions";
import { formatDate } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

const LEAVE_LABELS: Record<string, string> = {
  vacation: "Vacation", sick: "Sick", absence: "Absence", other: "Other",
};

export type LeaveRow = {
  id: string;
  date_from: string;
  date_to: string;
  type: string;
  paid: boolean;
  note: string | null;
};

export function LeavesPanel({
  employeeId,
  leaves,
}: {
  employeeId: string;
  leaves: LeaveRow[];
}) {
  const [adding, setAdding] = useState(false);
  const [state, formAction, pending] = useActionState(addLeave, null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-gray-900">Leaves & absences</p>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-sm font-medium text-brand-green-dark underline"
        >
          {adding ? "Cancel" : "+ Record leave"}
        </button>
      </div>

      {adding && (
        <form action={formAction} className="mb-3 space-y-2 rounded-lg border border-gray-200 p-3">
          <input type="hidden" name="employee_id" value={employeeId} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">From *</label>
              <input name="date_from" type="date" required className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-500">To (blank = 1 day)</label>
              <input name="date_to" type="date" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select name="type" required defaultValue="absence" className={inputClass}>
              {Object.entries(LEAVE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select name="paid" defaultValue="false" className={inputClass}>
              <option value="false">Unpaid</option>
              <option value="true">Paid</option>
            </select>
          </div>
          <input name="note" placeholder="Note (optional)" className={inputClass} />
          {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
          <button disabled={pending} className="w-full rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Saving…" : "Record leave"}
          </button>
        </form>
      )}

      {!leaves.length && <p className="text-sm text-gray-500">No leaves recorded.</p>}
      <ul className="divide-y divide-gray-100">
        {leaves.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <div>
              <p className="font-medium text-gray-800">
                {LEAVE_LABELS[l.type] ?? l.type}
                <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${l.paid ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {l.paid ? "paid" : "unpaid"}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(l.date_from)}
                {l.date_to !== l.date_from && ` → ${formatDate(l.date_to)}`}
                {l.note && ` · ${l.note}`}
              </p>
            </div>
            <button
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteLeave(l.id, employeeId);
                  if (res.error) setError(res.error);
                })
              }
              className="text-xs text-gray-400 underline"
            >
              remove
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
