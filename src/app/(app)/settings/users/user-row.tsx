"use client";

import { useActionState, useState, useTransition } from "react";
import { sendResetLink, setTempPassword, updateUserRole } from "./actions";
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
    <div className="space-y-2 p-4">
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
          <form action={formAction} className="space-y-2">
            <input type="hidden" name="user_id" value={user.id} />
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
          </form>
          <PasswordHelp userId={user.id} email={user.email} />
        </>
      )}
    </div>
  );
}

// Owner tools for a user who cannot log in: set a temporary password
// (works without email) or send the standard reset link.
function PasswordHelp({ userId, email }: { userId: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempState, tempAction, tempPending] = useActionState(setTempPassword, null);
  const [sending, startTransition] = useTransition();

  return (
    <div className="border-t border-gray-100 pt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs font-medium text-brand-green-dark underline"
      >
        🔑 Password help {open ? "▾" : "▸"}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <form action={tempAction} className="flex gap-2">
            <input type="hidden" name="user_id" value={userId} />
            <input
              name="password"
              type="text"
              minLength={8}
              required
              placeholder="Temporary password (min. 8)"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
            />
            <button
              disabled={tempPending}
              className="rounded-lg border border-brand-green px-3 py-2 text-xs font-semibold text-brand-green-dark disabled:opacity-60"
            >
              {tempPending ? "Setting…" : "Set"}
            </button>
          </form>
          <p className="text-[11px] leading-snug text-gray-400">
            Give the temporary password to the person directly — they log in
            with it and change it under More → 🔒 Change password. No email
            needed.
          </p>
          <button
            type="button"
            disabled={sending}
            onClick={() => {
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const res = await sendResetLink(email);
                if (res.error) setError(res.error);
                else setMessage(`Reset link emailed to ${email} (valid 1 hour — check spam too).`);
              });
            }}
            className="text-xs font-medium text-gray-500 underline disabled:opacity-60"
          >
            {sending ? "Sending…" : "…or email them a reset link instead"}
          </button>
          {tempState?.saved && !tempState.error && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
              Temporary password set — it works immediately.
            </p>
          )}
          {message && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">{message}</p>
          )}
          {(tempState?.error || error) && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {tempState?.error ?? error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
