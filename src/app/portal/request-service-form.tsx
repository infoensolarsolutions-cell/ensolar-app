"use client";

import { useActionState, useState } from "react";
import { requestService } from "./actions";

export function RequestServiceForm({ projectId }: { projectId: string }) {
  const [show, setShow] = useState(false);
  const [state, formAction, pending] = useActionState(requestService, null);

  if (state?.done) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2.5 text-sm font-medium text-green-800">
        ✓ Service request sent! Our team will contact you soon.
      </p>
    );
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="w-full rounded-xl border border-brand-green px-4 py-3 text-sm font-semibold text-brand-green-dark active:bg-brand-green/5"
      >
        Request Service
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
      <input type="hidden" name="project_id" value={projectId} />
      <textarea
        name="problem"
        rows={3}
        required
        placeholder="Describe the problem (e.g. inverter shows an error, no power output…)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none"
      />
      {state?.error && (
        <p className="text-xs font-medium text-red-600">{state.error}</p>
      )}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send request"}
        </button>
        <button type="button" onClick={() => setShow(false)} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
