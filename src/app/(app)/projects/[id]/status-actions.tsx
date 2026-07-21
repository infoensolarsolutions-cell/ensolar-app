"use client";

import { useState, useTransition } from "react";
import { updateProjectStatus, revertProjectStatus } from "../actions";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/crm";

const NEXT: Record<ProjectStatus, { to: ProjectStatus; label: string; staffOnly?: boolean } | null> = {
  pending: { to: "ongoing", label: "Start Project (Ongoing)" },
  ongoing: { to: "completed", label: "Mark as Completed" },
  completed: { to: "closed", label: "Close Project", staffOnly: true },
  closed: null,
};

const BACK: Partial<Record<ProjectStatus, ProjectStatus>> = {
  ongoing: "pending",
  completed: "ongoing",
  closed: "completed",
};

export function StatusActions({
  projectId,
  status,
  isStaff,
}: {
  projectId: string;
  status: ProjectStatus;
  isStaff: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rawNext = NEXT[status];
  const next = rawNext && (!rawNext.staffOnly || isStaff) ? rawNext : null;
  const back = isStaff ? BACK[status] : undefined;
  if (!next && !back) return null;

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}
      {next && (
        <button
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await updateProjectStatus(projectId, next.to);
              if (res.error) setError(res.error);
            });
          }}
          className="w-full rounded-xl bg-brand-green px-4 py-3.5 text-base font-semibold text-white active:bg-brand-green-dark disabled:opacity-60"
        >
          {pending ? "Working…" : next.label}
        </button>
      )}
      {status === "ongoing" && (
        <p className="text-center text-xs text-gray-400">
          Completing schedules a 6-month maintenance reminder automatically.
        </p>
      )}
      {back && (
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm(`Move this project back to ${PROJECT_STATUSES[back]}?`)) return;
            setError(null);
            startTransition(async () => {
              const res = await revertProjectStatus(projectId);
              if (res.error) setError(res.error);
            });
          }}
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 active:bg-gray-50 disabled:opacity-60"
        >
          {pending ? "Working…" : `↩ Move back to ${PROJECT_STATUSES[back]}`}
        </button>
      )}
    </div>
  );
}
