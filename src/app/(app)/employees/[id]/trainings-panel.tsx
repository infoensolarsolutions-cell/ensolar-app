"use client";

import { useActionState, useState, useTransition } from "react";
import { addTraining, deleteTraining } from "../attendance-admin-actions";
import { formatDate } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

const TYPE_LABELS: Record<string, string> = {
  training: "🎓 Training",
  seminar: "📖 Seminar",
  certification: "📜 Certification",
  workshop: "🔧 Workshop",
  other: "📌 Other",
};

export type TrainingRow = {
  id: string;
  title: string;
  provider: string | null;
  type: string;
  date_from: string;
  date_to: string | null;
  venue: string | null;
  certificate: boolean;
  notes: string | null;
};

export function TrainingsPanel({
  employeeId,
  trainings,
}: {
  employeeId: string;
  trainings: TrainingRow[];
}) {
  const [adding, setAdding] = useState(false);
  const [state, formAction, pending] = useActionState(addTraining, null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-gray-900">🎓 Personnel development</p>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-sm font-medium text-brand-green-dark underline"
        >
          {adding ? "Cancel" : "+ Record activity"}
        </button>
      </div>

      {adding && (
        <form action={formAction} className="mb-3 space-y-2 rounded-lg border border-gray-200 p-3">
          <input type="hidden" name="employee_id" value={employeeId} />
          <input
            name="title"
            required
            placeholder="Title * (e.g. Solar PV Installation Training)"
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-2">
            <select name="type" defaultValue="training" className={inputClass}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l.replace(/^\S+ /, "")}</option>
              ))}
            </select>
            <input name="provider" placeholder="Organizer / provider" className={inputClass} />
          </div>
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
          <input name="venue" placeholder="Venue / location" className={inputClass} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="certificate" value="yes" />
            Certificate received
          </label>
          <textarea name="notes" rows={2} placeholder="Notes (optional)" className={inputClass} />
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{state.error}</p>
          )}
          <button
            disabled={pending}
            className="w-full rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save activity"}
          </button>
        </form>
      )}

      {!trainings.length && !adding && (
        <p className="text-sm text-gray-500">
          No development activities recorded yet — trainings, seminars and
          certifications go here (part of the 201 file).
        </p>
      )}

      <ul className="divide-y divide-gray-100">
        {trainings.map((t) => (
          <li key={t.id} className="py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {TYPE_LABELS[t.type]?.split(" ")[0] ?? "📌"} {t.title}
                  {t.certificate && (
                    <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                      ✓ Certificate
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(t.date_from)}
                  {t.date_to && t.date_to !== t.date_from && ` – ${formatDate(t.date_to)}`}
                  {t.provider && ` · ${t.provider}`}
                  {t.venue && ` · ${t.venue}`}
                </p>
                {t.notes && <p className="mt-0.5 text-xs text-gray-400">{t.notes}</p>}
              </div>
              <button
                onClick={() => {
                  if (!confirm(`Remove "${t.title}" from this employee's record?`)) return;
                  setError(null);
                  startTransition(async () => {
                    const res = await deleteTraining(t.id, employeeId);
                    if (res.error) setError(res.error);
                  });
                }}
                className="shrink-0 text-xs text-red-500 underline"
              >
                remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}
