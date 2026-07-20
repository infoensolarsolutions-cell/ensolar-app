"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/(public)/login/actions";
import { PasswordInput } from "@/components/password-input";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, null);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          New password
        </label>
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} />
      </div>
      <div>
        <label
          htmlFor="confirm"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Repeat new password
        </label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" minLength={8} />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-4 py-3.5 text-base font-semibold text-white active:bg-brand-green-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
