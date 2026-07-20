"use client";

import { useActionState, useState } from "react";
import { updateMyProfile } from "./actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export function ProfileForm({
  name,
  phone,
}: {
  name: string;
  phone: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateMyProfile, null);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 active:bg-gray-50"
      >
        ✏️ Edit my details
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      <div>
        <label htmlFor="name" className="text-xs text-gray-500">Display name *</label>
        <input id="name" name="name" required defaultValue={name} className={inputClass} />
      </div>
      <div>
        <label htmlFor="phone" className="text-xs text-gray-500">Phone number</label>
        <input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} className={inputClass} />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}
      {state?.saved && !state.error && (
        <p className="text-xs font-medium text-green-700">Saved.</p>
      )}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg px-3 py-2.5 text-sm text-gray-500"
        >
          Close
        </button>
      </div>
    </form>
  );
}
