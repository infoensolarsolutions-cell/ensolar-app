"use client";

import { useActionState, useState } from "react";
import { saveBranch } from "./actions";
import type { Branch } from "./page";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export function BranchForm({ branch }: { branch?: Branch }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveBranch, null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={
          branch
            ? "text-xs font-medium text-brand-green-dark underline"
            : "w-full rounded-lg bg-brand-green px-4 py-3 text-sm font-semibold text-white active:bg-brand-green-dark"
        }
      >
        {branch ? "edit" : "＋ Add a branch"}
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-xl border border-gray-200 bg-white p-3">
      {branch && <input type="hidden" name="branch_id" value={branch.id} />}
      <div className="grid grid-cols-3 gap-2">
        <input
          name="code"
          defaultValue={branch?.code ?? ""}
          placeholder="Code * (e.g. BAIS)"
          required
          disabled={branch?.code === "MAIN"}
          className={`${inputClass} uppercase disabled:bg-gray-50`}
        />
        <input
          name="name"
          defaultValue={branch?.name ?? ""}
          placeholder="Branch name *"
          required
          className={`${inputClass} col-span-2`}
        />
      </div>
      <input name="address" defaultValue={branch?.address ?? ""} placeholder="Address" className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <input name="phone" defaultValue={branch?.phone ?? ""} placeholder="Phone" className={inputClass} />
        <select name="active" defaultValue={String(branch?.active ?? true)} className={inputClass}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      {branch?.code === "MAIN" && (
        <input type="hidden" name="code" value="MAIN" />
      )}
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{state.error}</p>
      )}
      {state?.saved && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">Saved.</p>
      )}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : branch ? "Save branch" : "Add branch"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">
          Close
        </button>
      </div>
    </form>
  );
}
