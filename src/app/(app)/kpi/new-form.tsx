"use client";

import { useActionState, useState } from "react";
import { createEvaluation } from "./actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export function NewEvaluationForm({
  employees,
}: {
  employees: { id: string; name: string; employee_position: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [state, formAction, pending] = useActionState(createEvaluation, null);

  const selected = employees.find((e) => e.id === employeeId);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-brand-green px-6 py-3.5 text-base font-semibold text-white active:bg-brand-green-dark max-lg:w-full"
      >
        + New Evaluation
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 lg:max-w-md">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-900">Start an evaluation</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 underline">
          close
        </button>
      </div>
      <select
        name="employee_id"
        required
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
        className={inputClass}
      >
        <option value="">Pick an employee…</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}{e.employee_position ? ` — ${e.employee_position}` : ""}
          </option>
        ))}
      </select>
      <input type="hidden" name="employee_name" value={selected?.name ?? ""} />
      <input type="hidden" name="employee_position" value={selected?.employee_position ?? ""} />
      <input name="period" placeholder="Evaluation period (e.g. Q3 2026) *" required className={inputClass} />
      <select name="supervisor_name" defaultValue="" className={inputClass}>
        <option value="">Assigned supervisor — pick a name…</option>
        {employees
          .filter((e) => e.id !== employeeId)
          .map((e) => (
            <option key={e.id} value={e.name}>
              {e.name}{e.employee_position ? ` — ${e.employee_position}` : ""}
            </option>
          ))}
      </select>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create scorecard"}
      </button>
    </form>
  );
}
