"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { addAppointment, deleteAppointment } from "./appointment-actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none";

export function AddMeetingForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addAppointment, null);

  useEffect(() => {
    if (state?.saved && !state.error) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-gray-500 active:bg-gray-50"
      >
        ＋ Add meeting
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-lg border border-gray-200 p-3">
      <input name="title" placeholder="Meeting / appointment *" required className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <input name="date" type="date" required className={inputClass} />
        <input name="time" type="time" className={inputClass} />
      </div>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add to agenda"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-xs text-gray-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function MeetingDelete({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this meeting from the agenda?")) return;
        startTransition(async () => {
          await deleteAppointment(id);
        });
      }}
      className="shrink-0 px-1.5 text-gray-300 hover:text-red-500 disabled:opacity-50"
      aria-label="Remove meeting"
    >
      ✕
    </button>
  );
}
