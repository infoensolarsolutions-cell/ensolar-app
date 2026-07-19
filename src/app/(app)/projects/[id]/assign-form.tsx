"use client";

import { useState, useTransition } from "react";
import { assignTechnicians } from "../actions";

export function AssignForm({
  projectId,
  technicians,
  assigned,
}: {
  projectId: string;
  technicians: { id: string; name: string }[];
  assigned: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(assigned));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty =
    selected.size !== assigned.length || assigned.some((id) => !selected.has(id));

  if (!technicians.length) {
    return (
      <p className="text-xs text-gray-400">
        No technician accounts yet — create them in Supabase Authentication and
        set their role to technician.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {technicians.map((t) => {
          const on = selected.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                const next = new Set(selected);
                if (on) next.delete(t.id);
                else next.add(t.id);
                setSelected(next);
              }}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium ${
                on
                  ? "border-brand-green bg-brand-green text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {t.name}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}
      {dirty && (
        <button
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await assignTechnicians(projectId, [...selected]);
              if (res.error) setError(res.error);
            });
          }}
          className="w-full rounded-lg border border-brand-green px-4 py-2.5 text-sm font-semibold text-brand-green-dark active:bg-brand-green/5 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save technician assignments"}
        </button>
      )}
    </div>
  );
}
