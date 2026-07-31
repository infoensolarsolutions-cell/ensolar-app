"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addProjectChecklist } from "../checklist-actions";
import { CHECKLIST_TEMPLATES } from "@/lib/checklists";

export type ChecklistSummary = {
  id: string;
  title: string;
  done: number;
  total: number;
  completed: boolean;
};

export function ChecklistsPanel({
  projectId,
  checklists,
}: {
  projectId: string;
  checklists: ChecklistSummary[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 font-semibold text-gray-900">Checklists</p>

      {checklists.length === 0 && (
        <p className="mb-2 text-sm text-gray-500">
          No checklists yet — add one below for the assigned team to accomplish.
        </p>
      )}
      <ul className="divide-y divide-gray-100">
        {checklists.map((c) => (
          <li key={c.id}>
            <Link
              href={`/projects/${projectId}/checklist/${c.id}`}
              className="flex items-center justify-between gap-2 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">{c.title}</p>
                <div className="mt-1 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-green"
                    style={{ width: `${c.total ? Math.round((c.done / c.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                  c.completed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                {c.completed ? "✓ Done" : `${c.done}/${c.total}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-2 border-t border-gray-100 pt-3">
        <select
          defaultValue=""
          disabled={pending}
          onChange={(e) => {
            const key = e.target.value;
            e.target.value = "";
            if (!key) return;
            setError(null);
            startTransition(async () => {
              const res = await addProjectChecklist(projectId, key);
              if (res.error) setError(res.error);
            });
          }}
          className="w-full rounded-lg border border-brand-green/50 px-3 py-2.5 text-sm font-medium focus:border-brand-green focus:outline-none disabled:opacity-60"
        >
          <option value="">＋ Add a checklist…</option>
          {CHECKLIST_TEMPLATES.map((t) => (
            <option key={t.key} value={t.key}>{t.title}</option>
          ))}
        </select>
        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        )}
      </div>
    </div>
  );
}
