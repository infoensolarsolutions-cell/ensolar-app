"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addProjectChecklist } from "../checklist-actions";
import { CHECKLIST_TEMPLATES } from "@/lib/checklists";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export type ChecklistSummary = {
  id: string;
  title: string;
  marked: number;
  total: number;
  fails: number;
  completed: boolean;
};

export function ChecklistsPanel({
  projectId,
  checklists,
}: {
  projectId: string;
  checklists: ChecklistSummary[];
}) {
  const [templateKey, setTemplateKey] = useState("");
  const [state, formAction, pending] = useActionState(addProjectChecklist, null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 font-semibold text-gray-900">Checklists</p>

      {checklists.length === 0 && (
        <p className="mb-2 text-sm text-gray-500">
          No checklists yet — add one below for the assigned team to accomplish.
        </p>
      )}
      <ul className="divide-y divide-gray-100">
        {checklists.map((c) => (
          <li key={c.id}>
            <Link
              href={`/projects/${projectId}/checklist/${c.id}`}
              className="flex items-center justify-between gap-2 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">{c.title}</p>
                <div className="mt-1 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${c.fails > 0 ? "bg-red-500" : "bg-brand-green"}`}
                    style={{ width: `${c.total ? Math.round((c.marked / c.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                  c.completed
                    ? "bg-green-100 text-green-800"
                    : c.fails > 0
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {c.completed
                  ? "✓ Done"
                  : c.fails > 0
                    ? `⚠ ${c.fails} non-compliant`
                    : `${c.marked}/${c.total}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-2 border-t border-gray-100 pt-3">
        {!templateKey ? (
          <select
            defaultValue=""
            onChange={(e) => setTemplateKey(e.target.value)}
            className="w-full rounded-lg border border-brand-green/50 px-3 py-2.5 text-sm font-medium focus:border-brand-green focus:outline-none"
          >
            <option value="">＋ Add a checklist…</option>
            {CHECKLIST_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>{t.title}</option>
            ))}
          </select>
        ) : (
          <form action={formAction} className="space-y-2">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="template_key" value={templateKey} />
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">
                {CHECKLIST_TEMPLATES.find((t) => t.key === templateKey)?.title}
              </p>
              <button
                type="button"
                onClick={() => setTemplateKey("")}
                className="text-xs text-gray-400 underline"
              >
                cancel
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Enter the equipment details (inverter, EV charger — or panel
              brand/model and total array kW for panel installation) —
              requirements are computed from them.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input name="brand" placeholder="Brand (e.g. Growatt, Canadian Solar) *" required className={inputClass} />
              <input name="model" placeholder="Model *" required className={inputClass} />
            </div>
            {templateKey === "lifepo4_battery_installation" ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    name="kw" type="number" min="0.1" step="any" inputMode="decimal"
                    placeholder="Inverter kW *" required className={inputClass}
                  />
                  <input
                    name="ah" type="number" min="1" step="any" inputMode="numeric"
                    placeholder="Ah per unit" className={inputClass}
                  />
                  <input
                    name="qty" type="number" min="1" step="1" inputMode="numeric"
                    placeholder="No. of units" className={inputClass}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Battery bank voltage is fixed at 51.2 V DC.
                </p>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <input
                  name="kw" type="number" min="0.1" step="any" inputMode="decimal"
                  placeholder="kW *" required className={inputClass}
                />
                <input
                  name="voltage" type="number" min="1" step="any" inputMode="numeric"
                  placeholder="Voltage *" required className={inputClass}
                />
                <select name="phases" required defaultValue="" className={inputClass}>
                  <option value="" disabled>Phase *</option>
                  <option value="1">Single-phase</option>
                  <option value="3">Three-phase</option>
                </select>
              </div>
            )}
            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {state.error}
              </p>
            )}
            <button
              disabled={pending}
              className="w-full rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Adding…" : "Add checklist"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
