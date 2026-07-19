"use client";

import { useState, useTransition } from "react";
import { updateProjectStatus } from "../actions";
import { type ProjectStatus } from "@/lib/crm";

const NEXT: Record<ProjectStatus, { to: ProjectStatus; label: string; staffOnly?: boolean } | null> = {
  pending: { to: "ongoing", label: "Start Project (Ongoing)" },
  ongoing: { to: "completed", label: "Mark as Completed" },
  completed: { to: "closed", label: "Close Project", staffOnly: true },
  closed: null,
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

  const next = NEXT[status];
  if (!next || (next.staffOnly && !isStaff)) return null;

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}
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
      {status === "ongoing" && (
        <p className="text-center text-xs text-gray-400">
          Completing schedules a 6-month maintenance reminder automatically.
        </p>
      )}
    </div>
  );
}
