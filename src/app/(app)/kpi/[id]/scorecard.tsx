"use client";

import { useActionState, useState, useTransition } from "react";
import { saveEvaluation, deleteEvaluation } from "../actions";
import {
  KPI_CRITERIA, RATING_LABELS, band, totalFor, type KpiScore,
} from "@/lib/kpi";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

type Evaluation = {
  id: string;
  employee_name: string;
  employee_position: string | null;
  period: string;
  supervisor_name: string | null;
  status: "draft" | "supervisor_done" | "final";
  scores: KpiScore[];
  supervisor_comments: string | null;
  manager_comments: string | null;
  development_plan: string | null;
};

function RatingSelect({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled: boolean;
  onChange: (v: number | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-brand-green focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
    >
      <option value="">—</option>
      {[5, 4, 3, 2, 1].map((n) => (
        <option key={n} value={n}>{RATING_LABELS[n]}</option>
      ))}
    </select>
  );
}

export function Scorecard({
  evaluation,
  isOwner,
}: {
  evaluation: Evaluation;
  isOwner: boolean;
}) {
  const locked = evaluation.status === "final";
  const [scores, setScores] = useState<KpiScore[]>(evaluation.scores);
  const [state, formAction, pending] = useActionState(saveEvaluation, null);
  const [delError, setDelError] = useState<string | null>(null);
  const [delPending, startDelete] = useTransition();

  const supTotal = totalFor(scores, "sup");
  const mgrTotal = totalFor(scores, "mgr");

  function setRating(key: string, field: "sup" | "mgr", v: number | null) {
    setScores((cur) => cur.map((s) => (s.key === key ? { ...s, [field]: v } : s)));
  }

  const statusNote =
    evaluation.status === "draft"
      ? "Draft — supervisor ratings in progress."
      : evaluation.status === "supervisor_done"
        ? "Supervisor ratings submitted — awaiting the manager's final evaluation."
        : "Finalized — locked. Only the owner can reopen it.";

  return (
    <form action={formAction} className="space-y-4 p-4">
      <input type="hidden" name="evaluation_id" value={evaluation.id} />
      <input type="hidden" name="scores" value={JSON.stringify(scores)} />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-gray-900">{evaluation.employee_name}</p>
            <p className="text-sm text-gray-600">
              {evaluation.employee_position ?? "—"} · {evaluation.period}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              locked
                ? "bg-green-100 text-green-800"
                : evaluation.status === "supervisor_done"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {locked ? "Final" : evaluation.status === "supervisor_done" ? "Awaiting manager" : "Draft"}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">{statusNote}</p>
        <div className="mt-2">
          <label className="text-xs text-gray-500">Assigned supervisor</label>
          <input
            name="supervisor_name"
            defaultValue={evaluation.supervisor_name ?? ""}
            disabled={locked}
            placeholder="Supervisor's name"
            className={`${inputClass} disabled:bg-gray-50`}
          />
        </div>
      </div>

      {/* Score totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Supervisor score</p>
          <p className="text-xl font-extrabold text-gray-900">{supTotal}</p>
          <p className="text-xs font-medium text-gray-500">{band(supTotal)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Manager final score</p>
          <p className="text-xl font-extrabold text-brand-green-dark">{mgrTotal}</p>
          <p className="text-xs font-medium text-gray-500">{band(mgrTotal)}</p>
        </div>
      </div>

      {/* Criteria */}
      <div className="space-y-3">
        {KPI_CRITERIA.map((c, idx) => {
          const s = scores.find((x) => x.key === c.key)!;
          return (
            <div key={c.key} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800">
                  {idx + 1}. {c.name}
                </p>
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                  {c.weight}%
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{c.desc}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-gray-500">Supervisor</label>
                  <RatingSelect
                    value={s.sup}
                    disabled={locked}
                    onChange={(v) => setRating(c.key, "sup", v)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Manager (final)</label>
                  {isOwner ? (
                    <RatingSelect
                      value={s.mgr}
                      disabled={locked}
                      onChange={(v) => setRating(c.key, "mgr", v)}
                    />
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-2 py-2 text-sm text-gray-500">
                      {s.mgr ? RATING_LABELS[s.mgr] : "— owner only"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comments */}
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className="text-xs text-gray-500">Supervisor&rsquo;s comments</label>
          <textarea
            name="supervisor_comments"
            rows={2}
            defaultValue={evaluation.supervisor_comments ?? ""}
            disabled={locked}
            className={`${inputClass} disabled:bg-gray-50`}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Manager&rsquo;s final remarks {isOwner ? "" : "(owner only)"}</label>
          <textarea
            name="manager_comments"
            rows={2}
            defaultValue={evaluation.manager_comments ?? ""}
            disabled={locked || !isOwner}
            className={`${inputClass} disabled:bg-gray-50`}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Development plan / targets for next period {isOwner ? "" : "(owner only)"}</label>
          <textarea
            name="development_plan"
            rows={2}
            defaultValue={evaluation.development_plan ?? ""}
            disabled={locked || !isOwner}
            className={`${inputClass} disabled:bg-gray-50`}
          />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}
      {state?.saved && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">✓ Saved.</p>
      )}
      {delError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{delError}</p>
      )}

      {/* Actions */}
      {!locked ? (
        <div className="space-y-2">
          <button
            name="intent"
            value="save"
            disabled={pending}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save progress"}
          </button>
          {evaluation.status === "draft" && (
            <button
              name="intent"
              value="submit_supervisor"
              disabled={pending}
              className="w-full rounded-xl border border-brand-green px-4 py-3 text-sm font-semibold text-brand-green-dark active:bg-brand-green/5 disabled:opacity-60"
            >
              Submit supervisor ratings
            </button>
          )}
          {isOwner && (
            <button
              name="intent"
              value="finalize"
              disabled={pending}
              className="w-full rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white active:bg-brand-green-dark disabled:opacity-60"
            >
              ✓ Finalize evaluation (locks the scorecard)
            </button>
          )}
        </div>
      ) : (
        isOwner && (
          <button
            name="intent"
            value="reopen"
            disabled={pending}
            className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-amber-700 active:bg-amber-50 disabled:opacity-60"
          >
            Reopen for corrections
          </button>
        )
      )}

      {isOwner && (
        <button
          type="button"
          disabled={delPending}
          onClick={() => {
            if (!confirm(`Delete this evaluation of ${evaluation.employee_name} (${evaluation.period})? This cannot be undone.`)) return;
            setDelError(null);
            startDelete(async () => {
              const res = await deleteEvaluation(evaluation.id);
              if (res?.error) setDelError(res.error);
            });
          }}
          className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 active:bg-red-50 disabled:opacity-60"
        >
          🗑 Delete evaluation
        </button>
      )}
    </form>
  );
}
