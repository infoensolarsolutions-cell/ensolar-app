"use client";

import { useActionState, useState } from "react";
import { updateSiteAddress } from "../actions";

export function SiteAddressForm({
  projectId,
  siteAddress,
}: {
  projectId: string;
  siteAddress: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateSiteAddress, null);

  if (!open) {
    return (
      <p>
        📍 {siteAddress || <span className="text-gray-400">No site address</span>}{" "}
        <button
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-brand-green-dark underline"
        >
          edit
        </button>
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="project_id" value={projectId} />
      <input
        name="site_address"
        defaultValue={siteAddress ?? ""}
        placeholder="Installation site address"
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none"
      />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 active:bg-gray-50"
        >
          Close
        </button>
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save address"}
        </button>
      </div>
    </form>
  );
}
