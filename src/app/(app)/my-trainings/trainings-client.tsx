"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { addMyTraining, deleteMyTraining } from "./actions";
import { formatDate } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export const TRAINING_TYPES: Record<string, string> = {
  training: "🎓 Training",
  seminar: "🪑 Seminar",
  certification: "📜 Certification",
  workshop: "🔧 Workshop",
  other: "📌 Other",
};

export type MyTrainingRow = {
  id: string;
  title: string;
  provider: string | null;
  type: string;
  date_from: string;
  date_to: string | null;
  venue: string | null;
  certificate: boolean;
  notes: string | null;
  created_by: string | null;
};

export function MyTrainingsClient({
  rows,
  meId,
}: {
  rows: MyTrainingRow[];
  meId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-lg bg-brand-green px-4 py-3 text-sm font-semibold text-white active:bg-brand-green-dark"
        >
          + Add a training / seminar I attended
        </button>
      ) : (
        <AddForm onDone={() => setShowForm(false)} />
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}

      {rows.length === 0 && (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
          No trainings recorded yet. Add the seminars, trainings, and
          certifications you attended — past or recent — so they go on your
          record.
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((t) => (
          <li key={t.id} className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-gray-900">{t.title}</p>
                <p className="text-xs text-gray-600">
                  {TRAINING_TYPES[t.type] ?? t.type}
                  {t.provider && ` · ${t.provider}`}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(t.date_from)}
                  {t.date_to && t.date_to !== t.date_from && ` – ${formatDate(t.date_to)}`}
                  {t.venue && ` · ${t.venue}`}
                </p>
                {t.certificate && (
                  <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">
                    📜 With certificate
                  </span>
                )}
                {t.notes && <p className="mt-1 text-xs text-gray-500">{t.notes}</p>}
              </div>
              {t.created_by === meId && (
                <button
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Remove "${t.title}" from your record?`)) return;
                    setError(null);
                    startTransition(async () => {
                      const res = await deleteMyTraining(t.id);
                      if (res.error) setError(res.error);
                    });
                  }}
                  className="shrink-0 text-xs text-gray-400 underline disabled:opacity-50"
                >
                  remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(addMyTraining, null);

  useEffect(() => {
    if (state?.saved && !state.error) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-700">New activity</p>
      <input name="title" required placeholder="Title, e.g. Solar PV Installation Seminar" className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <select name="type" defaultValue="training" className={inputClass}>
          {Object.entries(TRAINING_TYPES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input name="provider" placeholder="Organizer / provider" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">From</label>
          <input name="date_from" type="date" required className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500">To (optional)</label>
          <input name="date_to" type="date" className={inputClass} />
        </div>
      </div>
      <input name="venue" placeholder="Venue (optional)" className={inputClass} />
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="certificate" value="yes" />
        I received a certificate
      </label>
      <input name="notes" placeholder="Notes (optional)" className={inputClass} />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{state.error}</p>
      )}
      <div className="flex gap-2">
        <button disabled={pending} className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save to my record"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
