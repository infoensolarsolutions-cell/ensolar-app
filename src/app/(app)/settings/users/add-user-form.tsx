"use client";

import { useActionState } from "react";
import { createUser } from "./actions";
import { ROLE_LABELS, type UserRole } from "@/lib/auth-shared";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export function AddUserForm() {
  const [state, formAction, pending] = useActionState(createUser, null);

  return (
    <form action={formAction} className="space-y-3 p-4">
      <div>
        <label className="text-xs text-gray-500">Full name *</label>
        <input name="name" required className={inputClass} />
      </div>
      <div>
        <label className="text-xs text-gray-500">Email *</label>
        <input name="email" type="email" required className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Role *</label>
          <select name="role" defaultValue="technician" className={inputClass}>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Temporary password *</label>
          <input name="password" required minLength={8} className={inputClass} />
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Share the temporary password with the person privately. They can change
        it any time via &ldquo;Forgot password?&rdquo; on the login page.
      </p>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
      {state?.saved && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          Account created. They can log in now.
        </p>
      )}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
