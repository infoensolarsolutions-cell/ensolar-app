"use client";

import { useActionState } from "react";
import { updateProjectDates } from "../actions";

export function DatesForm({
  projectId,
  startDate,
  targetDate,
}: {
  projectId: string;
  startDate: string | null;
  targetDate: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProjectDates, null);

  return (
    <form action={formAction} className="rounded-xl border border-gray-200 bg-white p-4">
      <input type="hidden" name="project_id" value={projectId} />
      <p className="mb-2 font-semibold text-gray-900">Schedule</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start_date" className="text-xs text-gray-500">Start date</label>
          <input
            id="start_date" name="start_date" type="date" defaultValue={startDate ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="target_date" className="text-xs text-gray-500">Target completion</label>
          <input
            id="target_date" name="target_date" type="date" defaultValue={targetDate ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>
      </div>
      {state?.error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}
      {state?.saved && (
        <p className="mt-2 text-xs font-medium text-green-700">Saved.</p>
      )}
      <button
        disabled={pending}
        className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save dates"}
      </button>
    </form>
  );
}
