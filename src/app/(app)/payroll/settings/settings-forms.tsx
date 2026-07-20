"use client";

import { useActionState, useState } from "react";
import { saveContribution } from "./actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

const FIELD_LABELS: Record<string, string> = {
  employee_percent: "Employee share (%)",
  min_monthly: "Minimum monthly salary base ₱",
  max_monthly: "Maximum monthly salary base ₱",
  total_percent: "Total premium rate (%)",
  employee_share_percent: "Employee share of premium (%)",
  max_monthly_compensation: "Max monthly compensation ₱",
  regular_hours_per_day: "Regular working hours per day",
  unpaid_break_hours: "Unpaid break hours per day",
  overtime_multiplier_percent: "Overtime rate (% of hourly rate)",
};

export function ParamsForm({
  settingKey,
  label,
  config,
}: {
  settingKey: string;
  label: string;
  config: Record<string, number>;
}) {
  const [state, formAction, pending] = useActionState(saveContribution, null);

  return (
    <form action={formAction} className="rounded-xl border border-gray-200 bg-white p-4">
      <input type="hidden" name="key" value={settingKey} />
      <p className="mb-3 font-semibold text-gray-900">{label}</p>
      <div className="space-y-2">
        {Object.entries(config).map(([field, value]) => (
          <div key={field}>
            <label className="text-xs text-gray-500">
              {FIELD_LABELS[field] ?? field}
            </label>
            <input
              name={field}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              defaultValue={value}
              className={inputClass}
            />
          </div>
        ))}
      </div>
      {state?.error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}
      {state?.saved && (
        <p className="mt-2 text-xs font-medium text-green-700">Saved.</p>
      )}
      <button disabled={pending} className="mt-3 w-full rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : `Save ${label}`}
      </button>
    </form>
  );
}

type Bracket = { over: number; base: number; percent: number };

export function TaxForm({ brackets }: { brackets: Bracket[] }) {
  const [rows, setRows] = useState<Bracket[]>(brackets);
  const [state, formAction, pending] = useActionState(saveContribution, null);

  function update(i: number, field: keyof Bracket, v: string) {
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, [field]: Number(v) || 0 } : r)));
  }

  return (
    <form action={formAction} className="rounded-xl border border-gray-200 bg-white p-4">
      <input type="hidden" name="key" value="tax" />
      <input type="hidden" name="brackets" value={JSON.stringify(rows)} />
      <p className="mb-1 font-semibold text-gray-900">Withholding Tax (semi-monthly)</p>
      <p className="mb-3 text-xs text-gray-500">
        Per cutoff: tax = base + percent × (taxable pay − “over” amount) of the
        highest matching row.
      </p>
      <div className="mb-1 grid grid-cols-[1fr_1fr_4.5rem_2rem] gap-2 text-xs font-semibold text-gray-500">
        <span>Over ₱</span><span>Base tax ₱</span><span>%</span><span />
      </div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_4.5rem_2rem] items-center gap-2">
            <input type="number" min="0" step="any" value={r.over} onChange={(e) => update(i, "over", e.target.value)} className={inputClass} />
            <input type="number" min="0" step="any" value={r.base} onChange={(e) => update(i, "base", e.target.value)} className={inputClass} />
            <input type="number" min="0" max="100" step="any" value={r.percent} onChange={(e) => update(i, "percent", e.target.value)} className={inputClass} />
            <button
              type="button"
              onClick={() => setRows((cur) => cur.filter((_, idx) => idx !== i))}
              className="text-sm text-gray-400"
              aria-label="Remove row"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows((cur) => [...cur, { over: 0, base: 0, percent: 0 }])}
        className="mt-2 text-sm font-medium text-brand-green-dark underline"
      >
        + Add bracket
      </button>
      {state?.error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}
      {state?.saved && <p className="mt-2 text-xs font-medium text-green-700">Saved.</p>}
      <button disabled={pending} className="mt-3 w-full rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save tax table"}
      </button>
    </form>
  );
}
