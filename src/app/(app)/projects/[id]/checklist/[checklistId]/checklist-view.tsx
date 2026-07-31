"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  toggleChecklistItem,
  saveChecklistRemarks,
  deleteProjectChecklist,
} from "../../../checklist-actions";
import type { ChecklistItem } from "@/lib/checklists";
import { formatDate } from "@/lib/format";

export function ChecklistView({
  checklist,
  isOwner,
}: {
  checklist: {
    id: string;
    projectId: string;
    title: string;
    items: ChecklistItem[];
    remarks: string | null;
    completed_at: string | null;
  };
  isOwner: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[]>(checklist.items);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const [pending, startTransition] = useTransition();

  const done = items.filter((i) => i.done).length;
  const allDone = done === items.length;

  function toggle(item: ChecklistItem) {
    const next = !item.done;
    // Optimistic tick; the server records the real name/timestamp.
    setItems((cur) =>
      cur.map((i) => (i.key === item.key ? { ...i, done: next, by: next ? "…" : null, at: null } : i)),
    );
    setError(null);
    startTransition(async () => {
      const res = await toggleChecklistItem(checklist.id, item.key, next);
      if (res.error) {
        setError(res.error);
        setItems((cur) =>
          cur.map((i) => (i.key === item.key ? { ...i, done: !next } : i)),
        );
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-gray-900">{checklist.title}</p>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
              allDone ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            {done}/{items.length}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-green transition-all"
            style={{ width: `${Math.round((done / items.length) * 100)}%` }}
          />
        </div>
        {allDone && checklist.completed_at && (
          <p className="mt-2 text-xs font-medium text-green-700">
            ✓ Completed {formatDate(checklist.completed_at)}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          Tap an item to mark it done — your name and the date are recorded.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}

      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => toggle(item)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                item.done
                  ? "border-brand-green/40 bg-brand-green/5"
                  : "border-gray-200 bg-white"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${
                  item.done
                    ? "border-brand-green bg-brand-green text-white"
                    : "border-gray-300 bg-white text-transparent"
                }`}
              >
                ✓
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm ${
                    item.done ? "text-gray-500" : "text-gray-800"
                  }`}
                >
                  <span className="mr-1 font-semibold text-gray-400">{idx + 1}.</span>
                  {item.label}
                </span>
                {item.done && item.by && (
                  <span className="mt-0.5 block text-xs text-brand-green-dark">
                    ✓ {item.by}
                    {item.at && ` · ${formatDate(item.at)}`}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="text-xs text-gray-500">Remarks / issues found (optional)</label>
        <textarea
          rows={3}
          defaultValue={checklist.remarks ?? ""}
          onChange={() => setSavedNote(false)}
          id="checklist-remarks"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const el = document.getElementById("checklist-remarks") as HTMLTextAreaElement | null;
            startTransition(async () => {
              const res = await saveChecklistRemarks(checklist.id, el?.value ?? "");
              if (res.error) setError(res.error);
              else setSavedNote(true);
            });
          }}
          className="mt-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-60"
        >
          Save remarks
        </button>
        {savedNote && <span className="ml-2 text-xs font-medium text-green-700">✓ Saved</span>}
      </div>

      {isOwner && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete the "${checklist.title}" checklist? Ticked progress will be lost.`)) return;
            startTransition(async () => {
              const res = await deleteProjectChecklist(checklist.id);
              if (res.error) setError(res.error);
              else router.replace(`/projects/${checklist.projectId}`);
            });
          }}
          className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 active:bg-red-50 disabled:opacity-60"
        >
          🗑 Delete checklist
        </button>
      )}
    </div>
  );
}
