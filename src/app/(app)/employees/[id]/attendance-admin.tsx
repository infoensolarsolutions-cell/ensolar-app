"use client";

import { useActionState, useState } from "react";
import {
  correctAttendance,
  addManualAttendance,
} from "../attendance-admin-actions";
import { formatDate } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export type AttendanceEntry = {
  id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_local: string;
  clock_out_local: string;
  source: string;
  hours: number;
  ot: number;
};

function fmtTime(ts: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
  }).format(new Date(ts));
}

export function AttendanceAdmin({
  employeeId,
  entries,
}: {
  employeeId: string;
  entries: AttendanceEntry[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editState, editAction, editPending] = useActionState(correctAttendance, null);
  const [addState, addAction, addPending] = useActionState(addManualAttendance, null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-gray-900">Attendance</p>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-sm font-medium text-brand-green-dark underline"
        >
          {adding ? "Cancel" : "+ Manual entry"}
        </button>
      </div>

      {adding && (
        <form action={addAction} className="mb-3 space-y-2 rounded-lg border border-gray-200 p-3">
          <input type="hidden" name="employee_id" value={employeeId} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Clock in *</label>
              <input name="clock_in" type="datetime-local" required className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Clock out</label>
              <input name="clock_out" type="datetime-local" className={inputClass} />
            </div>
          </div>
          <input name="reason" placeholder="Reason (required — e.g. forgot to clock in)" required className={inputClass} />
          {addState?.error && <p className="text-xs font-medium text-red-600">{addState.error}</p>}
          <button disabled={addPending} className="w-full rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {addPending ? "Saving…" : "Add entry"}
          </button>
        </form>
      )}

      {!entries.length && <p className="text-sm text-gray-500">No attendance records.</p>}
      <ul className="divide-y divide-gray-100">
        {entries.map((a) => (
          <li key={a.id} className="py-2">
            {editing === a.id ? (
              <form action={editAction} className="space-y-2 rounded-lg border border-gray-200 p-3">
                <input type="hidden" name="attendance_id" value={a.id} />
                <input type="hidden" name="employee_id" value={employeeId} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Clock in *</label>
                    <input name="clock_in" type="datetime-local" defaultValue={a.clock_in_local} required className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Clock out</label>
                    <input name="clock_out" type="datetime-local" defaultValue={a.clock_out_local} className={inputClass} />
                  </div>
                </div>
                <input name="reason" placeholder="Reason for correction (required)" required className={inputClass} />
                {editState?.error && <p className="text-xs font-medium text-red-600">{editState.error}</p>}
                <div className="flex gap-2">
                  <button disabled={editPending} className="flex-1 rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    {editPending ? "Saving…" : "Save correction"}
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-3 py-2 text-sm text-gray-500">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-700">
                  {formatDate(a.clock_in)}
                  {a.source === "admin" && (
                    <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      corrected
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">
                    {fmtTime(a.clock_in)} – {a.clock_out ? fmtTime(a.clock_out) : "…"}
                    {a.clock_out && (
                      <span className="ml-1.5 text-xs text-gray-500">{a.hours}h</span>
                    )}
                    {a.ot > 0 && (
                      <span className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                        +{a.ot}h OT
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setEditing(a.id)}
                    className="text-xs text-gray-400 underline"
                  >
                    edit
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
