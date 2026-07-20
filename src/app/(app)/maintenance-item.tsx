"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setReminderStatus } from "./projects/ticket-actions";
import { formatDate } from "@/lib/format";

export function MaintenanceItem({
  reminder,
}: {
  reminder: {
    id: string;
    project_id: string;
    project_no: string;
    customer_name: string;
    due_date: string;
    note: string | null;
    overdue: boolean;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="py-2.5">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/projects/${reminder.project_id}`} className="min-w-0">
          <p className={`text-sm font-semibold ${reminder.overdue ? "text-red-700" : "text-gray-800"}`}>
            {reminder.customer_name}
          </p>
          <p className="truncate text-xs text-gray-500">
            {reminder.project_no} · due {formatDate(reminder.due_date)}
            {reminder.note && ` · ${reminder.note}`}
          </p>
        </Link>
        <div className="flex shrink-0 gap-1.5">
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await setReminderStatus(reminder.id, "done");
                if (res.error) setError(res.error);
              })
            }
            className="rounded-lg border border-brand-green px-2.5 py-1.5 text-xs font-semibold text-brand-green-dark"
          >
            Done
          </button>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await setReminderStatus(reminder.id, "dismissed");
                if (res.error) setError(res.error);
              })
            }
            className="rounded-lg px-2 py-1.5 text-xs text-gray-400"
          >
            Dismiss
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </li>
  );
}
