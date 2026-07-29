"use client";

import { useActionState, useState, useTransition } from "react";
import { saveEvaluation, saveSelfEvaluation, deleteEvaluation } from "../actions";
import {
  KPI_CRITERIA, RATING_WORDS, SCALE_NOTE, band, totalFor, type KpiScore,
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
  self_comments: string | null;
  self_submitted_at: string | null;
};

export type Viewer = "owner" | "staff" | "employee";

// Tick boxes 1–5: tap to rate, tap the same number again to clear.
function RatingTicks({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled: boolean;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n;
        const reached = value !== null && n <= value;
        return (
          <button
            type="button"
            key={n}
            disabled={disabled}
            onClick={() => onChange(selected ? null : n)}
            className={`h-9 w-9 rounded-full border text-sm font-bold transition-colors ${
              selected
                ? "border-brand-green bg-brand-green text-white"
                : reached
                  ? "border-brand-green/40 bg-brand-green/15 text-brand-green-dark"
                  : "border-gray-300 bg-white text-gray-500"
            } disabled:opacity-50`}
          >
            {n}
          </button>
        );
      })}
      <span className="ml-1 text-xs font-medium text-gray-500">
        {value ? RATING_WORDS[value] : ""}
      </span>
    </div>
  );
}

function ScoreTile({ label, total, highlight }: { label: string; total: number; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-xl font-extrabold ${highlight ? "text-brand-green-dark" : "text-gray-900"}`}>
        {total}
      </p>
      <p className="text-xs font-medium text-gray-500">{band(total)}</p>
    </div>
  );
}

export function Scorecard({
  evaluation,
  viewer,
}: {
  evaluation: Evaluation;
  viewer: Viewer;
}) {
  const locked = evaluation.status === "final";
  const isEmployee = viewer === "employee";
  const isOwner = viewer === "owner";
  // The employee sees supervisor/manager results only after finalization.
  const showStaffColumns = !isEmployee || locked;

  const [scores, setScores] = useState<KpiScore[]>(evaluation.scores);
  const [state, formAction, pending] = useActionState(
    isEmployee ? saveSelfEvaluation : saveEvaluation,
    null,
  );
  const [delError, setDelError] = useState<string | null>(null);
  const [delPending, startDelete] = useTransition();

  const selfTotal = totalFor(scores, "self");
  const supTotal = totalFor(scores, "sup");
  const mgrTotal = totalFor(scores, "mgr");

  function setRating(key: string, field: "self" | "sup" | "mgr", v: number | null) {
    setScores((cur) => cur.map((s) => (s.key === key ? { ...s, [field]: v } : s)));
  }

  const statusNote = isEmployee
    ? locked
      ? "Finalized — your supervisor's and manager's ratings are now visible below."
      : evaluation.self_submitted_at
        ? "Self-evaluation submitted. You can still adjust it until the evaluation is finalized."
        : "Rate yourself on each item, then submit. Your supervisor's ratings stay hidden until the manager finalizes."
    : evaluation.status === "draft"
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
        {!isEmployee && (
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
        )}
      </div>

      {/* Score totals */}
      <div className={`grid gap-3 ${showStaffColumns ? "grid-cols-3" : "grid-cols-1"}`}>
        <ScoreTile label="Self score" total={selfTotal} />
        {showStaffColumns && <ScoreTile label="Supervisor score" total={supTotal} />}
        {showStaffColumns && <ScoreTile label="Manager final" total={mgrTotal} highlight />}
      </div>
      <p className="-mt-2 text-center text-xs text-gray-400">
        Rating scale per item: {SCALE_NOTE}. Scores are weighted out of 100.
      </p>

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
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500">
                    {isEmployee ? "My rating" : "Self-evaluation"}
                    {!isEmployee && s.self === null && (
                      <span className="ml-1 font-normal text-gray-400">— not yet rated</span>
                    )}
                  </label>
                  {isEmployee ? (
                    <RatingTicks
                      value={s.self}
                      disabled={locked}
                      onChange={(v) => setRating(c.key, "self", v)}
                    />
                  ) : (
                    s.self !== null && (
                      <p className="text-sm font-bold text-gray-700">{s.self} / 5</p>
                    )
                  )}
                </div>
                {showStaffColumns && (
                  <>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500">Supervisor</label>
                      {isEmployee ? (
                        <p className="text-sm font-bold text-gray-700">{s.sup ?? "—"} / 5</p>
                      ) : (
                        <RatingTicks
                          value={s.sup}
                          disabled={locked}
                          onChange={(v) => setRating(c.key, "sup", v)}
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500">Manager (final)</label>
                      {isOwner ? (
                        <RatingTicks
                          value={s.mgr}
                          disabled={locked}
                          onChange={(v) => setRating(c.key, "mgr", v)}
                        />
                      ) : (
                        <p className="text-sm font-bold text-gray-700">
                          {s.mgr !== null ? `${s.mgr} / 5` : isEmployee ? "—" : "— owner only"}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comments */}
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className="text-xs text-gray-500">
            {isEmployee ? "My comments (optional)" : "Employee's self-evaluation comments"}
          </label>
          {isEmployee ? (
            <textarea
              name="self_comments"
              rows={2}
              defaultValue={evaluation.self_comments ?? ""}
              disabled={locked}
              className={`${inputClass} disabled:bg-gray-50`}
            />
          ) : (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
              {evaluation.self_comments || "—"}
            </p>
          )}
        </div>
        {!isEmployee && (
          <>
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
              <label className="text-xs text-gray-500">
                Manager&rsquo;s final remarks {isOwner ? "" : "(owner only)"}
              </label>
              <textarea
                name="manager_comments"
                rows={2}
                defaultValue={evaluation.manager_comments ?? ""}
                disabled={locked || !isOwner}
                className={`${inputClass} disabled:bg-gray-50`}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">
                Development plan / targets for next period {isOwner ? "" : "(owner only)"}
              </label>
              <textarea
                name="development_plan"
                rows={2}
                defaultValue={evaluation.development_plan ?? ""}
                disabled={locked || !isOwner}
                className={`${inputClass} disabled:bg-gray-50`}
              />
            </div>
          </>
        )}
        {isEmployee && locked && (evaluation.manager_comments || evaluation.development_plan) && (
          <>
            {evaluation.manager_comments && (
              <div>
                <label className="text-xs text-gray-500">Manager&rsquo;s remarks</label>
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {evaluation.manager_comments}
                </p>
              </div>
            )}
            {evaluation.development_plan && (
              <div>
                <label className="text-xs text-gray-500">Development plan</label>
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {evaluation.development_plan}
                </p>
              </div>
            )}
          </>
        )}
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
      {isEmployee ? (
        !locked && (
          <div className="space-y-2">
            <button
              name="intent"
              value="save"
              disabled={pending}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save progress"}
            </button>
            <button
              name="intent"
              value="submit_self"
              disabled={pending}
              className="w-full rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white active:bg-brand-green-dark disabled:opacity-60"
            >
              Submit my self-evaluation
            </button>
          </div>
        )
      ) : !locked ? (
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
