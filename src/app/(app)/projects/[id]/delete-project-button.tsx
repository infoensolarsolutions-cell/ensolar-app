"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProject } from "../actions";

export function DeleteProjectButton({
  projectId,
  projectNo,
  hasMaterialCosts,
}: {
  projectId: string;
  projectNo: string;
  hasMaterialCosts: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="lg:col-span-full">
      {error && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={pending}
        onClick={() => {
          const warning =
            `Permanently delete project ${projectNo}?\n\n` +
            `Its photos, costs, milestones, technician assignments, and timeline will be removed. This cannot be undone.` +
            (hasMaterialCosts
              ? `\n\n⚠ Materials issued to this project will NOT return to stock automatically — use "Return to stock" on each material cost first if you want the stock back.`
              : "");
          if (!confirm(warning)) return;
          setError(null);
          startTransition(async () => {
            const res = await deleteProject(projectId);
            if (res?.error) setError(res.error);
            else router.replace("/projects");
          });
        }}
        className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 active:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "🗑 Delete this project"}
      </button>
      <p className="mt-1 text-center text-xs text-gray-400">
        Only for wrongly created projects. Blocked once payments, tickets, or a
        contract exist.
      </p>
    </div>
  );
}
