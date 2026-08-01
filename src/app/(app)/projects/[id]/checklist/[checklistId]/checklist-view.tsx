"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  setChecklistItemStatus,
  setChecklistItemComment,
  saveChecklistRemarks,
  deleteProjectChecklist,
} from "../../../checklist-actions";
import { fullLoadAmps, type ChecklistItem, type Equipment, type ItemStatus } from "@/lib/checklists";
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
    equipment: Equipment | null;
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

  const marked = items.filter((i) => i.status !== null).length;
  const fails = items.filter((i) => i.status === "fail").length;
  const allMarked = marked === items.length;
  const eq = checklist.equipment;

  function setStatus(item: ChecklistItem, status: ItemStatus) {
    const next = item.status === status ? null : status; // tap again to clear
    setItems((cur) =>
      cur.map((i) => (i.key === item.key ? { ...i, status: next, by: next ? "…" : null, at: null } : i)),
    );
    setError(null);
    startTransition(async () => {
      const res = await setChecklistItemStatus(checklist.id, item.key, next);
      if (res.error) {
        setError(res.error);
        setItems((cur) =>
          cur.map((i) => (i.key === item.key ? { ...i, status: item.status } : i)),
        );
      } else {
        router.refresh();
      }
    });
  }

  function editComment(item: ChecklistItem) {
    const comment = prompt("Comment for this item:", item.comment ?? "");
    if (comment === null) return;
    setItems((cur) =>
      cur.map((i) => (i.key === item.key ? { ...i, comment: comment.trim() || null } : i)),
    );
    startTransition(async () => {
      const res = await setChecklistItemComment(checklist.id, item.key, comment);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-gray-900">{checklist.title}</p>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
              allMarked && fails === 0
                ? "bg-green-100 text-green-800"
                : fails > 0
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {fails > 0 ? `⚠ ${fails} non-compliant` : `${marked}/${items.length}`}
          </span>
        </div>
        {eq && (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 sm:grid-cols-4">
            <p><span className="text-gray-400">Inverter:</span> <span className="font-semibold">{eq.brand} {eq.model}</span></p>
            <p><span className="text-gray-400">Rating:</span> <span className="font-semibold">{eq.kw} kW</span></p>
            <p><span className="text-gray-400">System:</span> <span className="font-semibold">{eq.voltage} V {eq.phases === 3 ? "3Ф" : "1Ф"}</span></p>
            <p><span className="text-gray-400">Full-load:</span> <span className="font-semibold">≈ {fullLoadAmps(eq)} A</span></p>
            {!!eq.ah && (
              <p className="col-span-2 sm:col-span-4">
                <span className="text-gray-400">Battery bank:</span>{" "}
                <span className="font-semibold">
                  {eq.qty && eq.qty > 1 ? `${eq.qty} × ` : ""}{eq.ah} Ah @ {eq.voltage} V
                  {" "}(≈ {Math.round(((eq.voltage * eq.ah) / 1000) * (eq.qty || 1) * 10) / 10} kWh total)
                </span>
              </p>
            )}
          </div>
        )}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${fails > 0 ? "bg-red-500" : "bg-brand-green"}`}
            style={{ width: `${Math.round((marked / items.length) * 100)}%` }}
          />
        </div>
        {allMarked && fails === 0 && checklist.completed_at && (
          <p className="mt-2 text-xs font-medium text-green-700">
            ✓ Completed {formatDate(checklist.completed_at)}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          Mark each item Comply / Not comply / N/A — your name and date are
          recorded. 💬 adds a comment.
        </p>
        <a
          href={`/api/checklists/${checklist.id}/pdf`}
          target="_blank"
          className="mt-3 block w-full rounded-lg border border-brand-green px-4 py-2.5 text-center text-sm font-semibold text-brand-green-dark active:bg-brand-green/5"
        >
          🖨 Print form (PDF) — blank boxes for site use, marks included once accomplished
        </a>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}

      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li
            key={item.key}
            className={`rounded-xl border p-3 ${
              item.status === "pass"
                ? "border-brand-green/40 bg-brand-green/5"
                : item.status === "fail"
                  ? "border-red-300 bg-red-50"
                  : item.status === "na"
                    ? "border-gray-200 bg-gray-50"
                    : "border-gray-200 bg-white"
            }`}
          >
            <p className="text-sm font-semibold text-gray-800">
              <span className="mr-1 text-gray-400">{idx + 1}.</span>
              {item.label}
            </p>
            {item.requirement && (
              <p className="mt-1 text-xs text-gray-500">
                <span className="font-semibold text-gray-400">Requirement: </span>
                {item.requirement}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatus(item, "pass")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                  item.status === "pass"
                    ? "border-brand-green bg-brand-green text-white"
                    : "border-gray-300 bg-white text-gray-600"
                }`}
              >
                ✓ Comply
              </button>
              <button
                type="button"
                onClick={() => setStatus(item, "fail")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                  item.status === "fail"
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-gray-300 bg-white text-gray-600"
                }`}
              >
                ✗ Not comply
              </button>
              <button
                type="button"
                onClick={() => setStatus(item, "na")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                  item.status === "na"
                    ? "border-gray-500 bg-gray-500 text-white"
                    : "border-gray-300 bg-white text-gray-600"
                }`}
              >
                N/A
              </button>
              <button
                type="button"
                onClick={() => editComment(item)}
                className={`ml-auto rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  item.comment
                    ? "border-amber-400 bg-amber-50 text-amber-800"
                    : "border-gray-300 bg-white text-gray-500"
                }`}
              >
                💬 {item.comment ? "Comment" : "Add comment"}
              </button>
            </div>
            {item.comment && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                💬 {item.comment}
              </p>
            )}
            {item.status && item.by && (
              <p className="mt-1.5 text-xs text-gray-500">
                {item.status === "pass" ? "✓ Complied" : item.status === "fail" ? "✗ Marked non-compliant" : "N/A"}
                {" by "}{item.by}
                {item.at && ` · ${formatDate(item.at)}`}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="text-xs text-gray-500">Overall remarks / issues found (optional)</label>
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
            if (!confirm(`Delete the "${checklist.title}" checklist? Marked progress will be lost.`)) return;
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
