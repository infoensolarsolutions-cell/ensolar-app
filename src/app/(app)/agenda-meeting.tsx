"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  addAppointment,
  updateAppointment,
  deleteAppointment,
} from "./appointment-actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none";

export type Meeting = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  attendees: string | null;
  location: string | null;
  purpose: string | null;
  method: string | null;
};

// Shared 5W1H fields. What = title, When = date/time, Who = attendees,
// Where = location, Why = purpose, How = method.
function MeetingFields({ meeting }: { meeting?: Meeting }) {
  return (
    <>
      <div>
        <label className="text-[11px] font-semibold text-gray-500">WHAT — meeting / appointment *</label>
        <input name="title" required defaultValue={meeting?.title ?? ""} placeholder="e.g. Site assessment meeting" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-gray-500">WHEN — date *</label>
          <input name="date" type="date" required defaultValue={meeting?.date ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500">Time</label>
          <input name="time" type="time" defaultValue={meeting?.time ?? ""} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-500">WHO — attendees</label>
        <input name="attendees" defaultValue={meeting?.attendees ?? ""} placeholder="e.g. Owner, Hotel Essencia engineer" className={inputClass} />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-500">WHERE — location</label>
        <input name="location" defaultValue={meeting?.location ?? ""} placeholder="e.g. Hotel Essencia, Dumaguete" className={inputClass} />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-500">WHY — purpose</label>
        <input name="purpose" defaultValue={meeting?.purpose ?? ""} placeholder="e.g. Finalize roof deck layout" className={inputClass} />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-500">HOW — format</label>
        <input name="method" list="meeting-methods" defaultValue={meeting?.method ?? ""} placeholder="e.g. Face-to-face" className={inputClass} />
        <datalist id="meeting-methods">
          {["Face-to-face", "Phone call", "Video call", "Site visit", "Messenger/chat"].map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
    </>
  );
}

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
      <MeetingFields />
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add to agenda"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-xs text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function MeetingItem({ meeting, label }: { meeting: Meeting; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateAppointment, null);
  const [delPending, startDelete] = useTransition();

  useEffect(() => {
    if (state?.saved && !state.error) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <form action={formAction} className="my-1 space-y-2 rounded-lg border border-brand-green/40 p-3">
        <input type="hidden" name="appointment_id" value={meeting.id} />
        <MeetingFields meeting={meeting} />
        {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
        <div className="flex gap-2">
          <button
            disabled={pending}
            className="flex-1 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-xs text-gray-500">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const detail: [string, string | null][] = [
    ["Who", meeting.attendees],
    ["Where", meeting.location],
    ["Why", meeting.purpose],
    ["How", meeting.method],
  ];

  return (
    <div className="py-1">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 py-1 text-left"
      >
        <span className="shrink-0">🗓</span>
        <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{label}</span>
        <span className="shrink-0 text-xs text-gray-300">{expanded ? "▴" : "▾"}</span>
      </button>
      {expanded && (
        <div className="ml-6 mt-1 rounded-lg bg-gray-50 p-2.5">
          <div className="space-y-0.5 text-xs text-gray-700">
            {detail.map(([k, v]) =>
              v ? (
                <p key={k}>
                  <span className="font-semibold text-gray-400">{k}: </span>
                  {v}
                </p>
              ) : null,
            )}
            {detail.every(([, v]) => !v) && (
              <p className="text-gray-400">No details yet — tap Edit to add the who/where/why/how.</p>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-brand-green/60 px-2.5 py-1 text-xs font-semibold text-brand-green-dark active:bg-brand-green/5"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={delPending}
              onClick={() => {
                if (!confirm("Remove this meeting from the agenda?")) return;
                startDelete(async () => {
                  await deleteAppointment(meeting.id);
                });
              }}
              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 active:bg-red-50 disabled:opacity-60"
            >
              ✕ Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
