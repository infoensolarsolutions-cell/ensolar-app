"use client";

import { useActionState, useEffect, useState } from "react";
import { changeMyPassword } from "./actions";
import { PasswordInput } from "@/components/password-input";

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(changeMyPassword, null);

  useEffect(() => {
    if (state?.saved && !state.error) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <div>
        <button
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-brand-green-dark underline"
        >
          🔒 Change password
        </button>
        {state?.saved && !state.error && (
          <p className="mt-1 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
            Password changed — use the new one next time you log in.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-lg border border-gray-200 p-3">
      <div>
        <label className="text-xs text-gray-500">New password (min. 8 characters)</label>
        <PasswordInput id="new-password" name="password" autoComplete="new-password" minLength={8} />
      </div>
      <div>
        <label className="text-xs text-gray-500">Repeat new password</label>
        <PasswordInput id="confirm-password" name="confirm" autoComplete="new-password" minLength={8} />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save new password"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2.5 text-sm text-gray-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
