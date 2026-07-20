"use client";

import { useActionState } from "react";
import { updateUserRole } from "./actions";
import { ROLE_LABELS, type UserRole } from "@/lib/auth-shared";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export function UserRow({
  user,
  isSelf,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    active: boolean;
  };
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateUserRole, null);

  return (
    <form action={formAction} className="space-y-2 p-4">
      <input type="hidden" name="user_id" value={user.id} />
      <div>
        <p className="font-semibold text-gray-900">{user.name || "(no name yet)"}</p>
        <p className="text-sm text-gray-600">{user.email}</p>
      </div>
      {isSelf ? (
        <p className="text-xs text-gray-400">
          This is you ({ROLE_LABELS[user.role]}) — you cannot change your own role.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Role</label>
              <select name="role" defaultValue={user.role} className={inputClass}>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <select name="active" defaultValue={String(user.active)} className={inputClass}>
                <option value="true">Active</option>
                <option value="false">Blocked</option>
              </select>
            </div>
          </div>
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {state.error}
            </p>
          )}
          {state?.saved && !state.error && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              Saved.
            </p>
          )}
          <button
            disabled={pending}
            className="w-full rounded-lg border border-brand-green px-4 py-2.5 text-sm font-semibold text-brand-green-dark active:bg-brand-green/5 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      )}
    </form>
  );
}
