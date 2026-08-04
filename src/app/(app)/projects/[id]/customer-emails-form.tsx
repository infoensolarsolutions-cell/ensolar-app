"use client";

import { useActionState, useEffect, useState } from "react";
import { updateCustomerEmails } from "../invite-actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none";

export function CustomerEmailsForm({
  customerId,
  projectId,
  email,
  email2,
}: {
  customerId: string;
  projectId: string;
  email: string | null;
  email2: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateCustomerEmails, null);

  useEffect(() => {
    if (state?.saved && !state.error) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <div className="text-sm text-gray-700">
        {email && <p>✉️ {email}</p>}
        {email2 && (
          <p>
            ✉️ {email2} <span className="text-xs text-gray-400">(2nd contact)</span>
          </p>
        )}
        <button
          onClick={() => setOpen(true)}
          className="mt-0.5 text-xs font-medium text-brand-green-dark underline"
        >
          {email || email2 ? "edit emails" : "＋ add customer email(s) for portal access"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-gray-200 p-3">
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="project_id" value={projectId} />
      <div>
        <label className="text-xs text-gray-500">Customer email</label>
        <input name="email" type="email" defaultValue={email ?? ""} className={inputClass} />
      </div>
      <div>
        <label className="text-xs text-gray-500">
          Second email (for a 2nd person&rsquo;s portal access)
        </label>
        <input name="email2" type="email" defaultValue={email2 ?? ""} className={inputClass} />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save emails"}
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
