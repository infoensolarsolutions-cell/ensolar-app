"use client";

import { useActionState } from "react";
import { createRun } from "./actions";

export function NewRunForm({ defaultStart }: { defaultStart: string }) {
  const [state, formAction, pending] = useActionState(createRun, null);

  return (
    <form
      action={formAction}
      className="space-y-2 rounded-xl border border-gray-200 bg-white p-4"
    >
      <p className="font-semibold text-gray-900">New payroll run</p>
      <label className="text-xs text-gray-500">
        Week starting (Monday) — covers Monday to Saturday
      </label>
      <input
        name="period_start"
        type="date"
        defaultValue={defaultStart}
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
      />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Computing…" : "Compute payroll"}
      </button>
    </form>
  );
}
