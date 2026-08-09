"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { addKbIssue, deleteKbIssue, updateKbIssue } from "./actions";
import { KB_CATEGORIES, type KbCategory } from "@/lib/kb";
import { formatDate } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export type KbRow = {
  id: string;
  category: KbCategory;
  brand: string | null;
  model: string | null;
  problem: string;
  solution: string;
  source: string | null;
  created_at: string;
};

export function KnowledgeView({
  entries,
  isStaff,
  isOwner,
}: {
  entries: KbRow[];
  isStaff: boolean;
  isOwner: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<KbCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      return [e.brand ?? "", e.model ?? "", e.problem, e.solution, e.source ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [entries, query, category]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) c[e.category] = (c[e.category] ?? 0) + 1;
    return c;
  }, [entries]);

  return (
    <div className="space-y-3 p-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Search problems, solutions, brands…"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            category === "all"
              ? "bg-brand-green text-white"
              : "border border-gray-300 text-gray-600"
          }`}
        >
          All ({entries.length})
        </button>
        {(Object.keys(KB_CATEGORIES) as KbCategory[])
          .filter((k) => counts[k])
          .map((k) => (
            <button
              key={k}
              onClick={() => setCategory(category === k ? "all" : k)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                category === k
                  ? "bg-brand-green text-white"
                  : "border border-gray-300 text-gray-600"
              }`}
            >
              {KB_CATEGORIES[k]} ({counts[k]})
            </button>
          ))}
      </div>

      {isStaff && (
        <>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full rounded-lg bg-brand-green px-4 py-3 text-sm font-semibold text-white active:bg-brand-green-dark"
            >
              + Add problem &amp; solution
            </button>
          ) : (
            <EntryForm onDone={() => setShowForm(false)} />
          )}
        </>
      )}

      {!entries.length && (
        <p className="pt-6 text-center text-sm text-gray-500">
          Nothing here yet. Add the first problem &amp; solution — future you will
          say thanks.
        </p>
      )}
      {entries.length > 0 && !filtered.length && (
        <p className="pt-6 text-center text-sm text-gray-500">No entries match.</p>
      )}

      {filtered.map((e) => (
        <EntryCard key={e.id} entry={e} isStaff={isStaff} isOwner={isOwner} />
      ))}
    </div>
  );
}

function EntryCard({
  entry,
  isStaff,
  isOwner,
}: {
  entry: KbRow;
  isStaff: boolean;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return <EntryForm entry={entry} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <button onClick={() => setOpen(!open)} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-green-dark">
              {KB_CATEGORIES[entry.category]}
              {entry.brand && ` · ${entry.brand}`}
              {entry.model && ` ${entry.model}`}
            </p>
            <p className={`mt-1 text-sm font-medium text-gray-900 ${open ? "" : "line-clamp-2"}`}>
              {entry.problem}
            </p>
          </div>
          <span className="shrink-0 text-gray-400">{open ? "▾" : "▸"}</span>
        </div>
      </button>

      {open && (
        <>
          <div className="mt-2 whitespace-pre-wrap rounded-lg bg-green-50 px-3 py-2 text-sm text-gray-800">
            <p className="mb-1 text-xs font-bold text-green-800">✅ Solution</p>
            {entry.solution}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>
              {formatDate(entry.created_at)}
              {entry.source && ` · from ${entry.source}`}
            </span>
            <span className="flex gap-3">
              {isStaff && (
                <button onClick={() => setEditing(true)} className="text-brand-green-dark underline">
                  edit
                </button>
              )}
              {isOwner && (
                <button
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("Delete this knowledge base entry?")) return;
                    setError(null);
                    startTransition(async () => {
                      const res = await deleteKbIssue(entry.id);
                      if (res.error) setError(res.error);
                    });
                  }}
                  className="text-red-600 underline disabled:opacity-60"
                >
                  delete
                </button>
              )}
            </span>
          </div>
          {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}

function EntryForm({ entry, onDone }: { entry?: KbRow; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    entry ? updateKbIssue : addKbIssue,
    null,
  );

  useEffect(() => {
    if (state?.saved && !state.error) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <div className="grid grid-cols-2 gap-2">
        <select name="category" defaultValue={entry?.category ?? "battery"} className={inputClass}>
          {Object.entries(KB_CATEGORIES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input name="brand" defaultValue={entry?.brand ?? ""} placeholder="Brand (e.g. Sunways)" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="model" defaultValue={entry?.model ?? ""} placeholder="Model (optional)" className={inputClass} />
        <input name="source" defaultValue={entry?.source ?? ""} placeholder="Source (e.g. Messenger chat)" className={inputClass} />
      </div>
      <textarea name="problem" defaultValue={entry?.problem ?? ""} rows={3} required placeholder="Problem — what happened / error shown" className={inputClass} />
      <textarea name="solution" defaultValue={entry?.solution ?? ""} rows={5} required placeholder="Solution — what fixed it, step by step" className={inputClass} />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{state.error}</p>
      )}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : entry ? "Save changes" : "Add to knowledge base"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
