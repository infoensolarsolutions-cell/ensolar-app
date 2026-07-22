"use client";

import { useActionState, useState } from "react";
import { broadcastMessage } from "./actions";

export function BroadcastForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(broadcastMessage, null);

  if (!open) {
    return (
      <div>
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-brand-green bg-brand-green/5 px-4 py-3 text-sm font-semibold text-brand-green-dark active:bg-brand-green/10"
        >
          📢 Message all members
        </button>
        {state?.sent && (
          <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-center text-sm font-medium text-green-700">
            Sent to {state.sent} member{state.sent === 1 ? "" : "s"}. ✓
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-2 rounded-xl border border-brand-green/50 bg-white p-4"
    >
      <p className="text-sm font-semibold text-gray-900">📢 Message all members</p>
      <p className="text-xs text-gray-500">
        Delivered instantly into every member&rsquo;s chat with you (owner,
        office staff, and technicians — not customers).
      </p>
      <textarea
        name="body"
        rows={3}
        required
        maxLength={1900}
        placeholder="e.g. Meeting at the office tomorrow 7:30 AM before deployment."
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 focus:border-brand-green focus:outline-none"
      />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 active:bg-gray-50"
        >
          Close
        </button>
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send to all"}
        </button>
      </div>
    </form>
  );
}
