"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  linkDeyeStation,
  unlinkDeyeStation,
  refreshDeyeData,
} from "../deye-actions";
import { MonthlyBars } from "@/components/charts";

type Metric = { label: string; value: string };

export function DeyePanel({
  projectId,
  isOwner,
  stationName,
  linked,
  stations,
  stationsError,
  metrics,
  energy,
  chart,
  allReadings,
  asOf,
  stale,
}: {
  projectId: string;
  isOwner: boolean;
  stationName: string | null;
  linked: boolean;
  stations: { id: string; name: string }[];
  stationsError: string | null;
  metrics: Metric[];
  energy: Metric[];
  chart: { label: string; value: number }[];
  allReadings: Metric[];
  asOf: string | null;
  stale: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const autoRefreshed = useRef(false);

  // Pages never wait for Deye — they render the cached reading, and when it
  // is stale this quietly fetches a fresh one in the background.
  useEffect(() => {
    if (!linked || !stale || autoRefreshed.current) return;
    autoRefreshed.current = true;
    startTransition(async () => {
      const res = await refreshDeyeData(projectId);
      if (!res.error) router.refresh();
    });
  }, [linked, stale, projectId, router]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-900">☀️ Live Monitoring (Deye)</p>
        {linked && (
          <button
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await refreshDeyeData(projectId);
                if (res.error) setError(res.error);
                else router.refresh();
              });
            }}
            className="shrink-0 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-60"
          >
            {pending ? "…" : "⟳ Refresh"}
          </button>
        )}
      </div>

      {!linked ? (
        isOwner ? (
          <div className="mt-2">
            {stationsError ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Could not reach Deye Cloud: {stationsError}. If this persists,
                the account region may differ — a different DEYE_BASE_URL may
                be needed.
              </p>
            ) : stations.length === 0 ? (
              <p className="text-sm text-gray-500">
                No stations found on the Deye account yet.
              </p>
            ) : (
              <select
                defaultValue=""
                disabled={pending}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const name = stations.find((s) => s.id === id)?.name ?? "";
                  setError(null);
                  startTransition(async () => {
                    const res = await linkDeyeStation(projectId, id, name);
                    if (res.error) setError(res.error);
                    else router.refresh();
                  });
                }}
                className="w-full rounded-lg border border-brand-green/50 px-3 py-2.5 text-sm font-medium focus:border-brand-green focus:outline-none disabled:opacity-60"
              >
                <option value="">🔗 Link this project to a Deye station…</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            No monitoring station linked yet.
          </p>
        )
      ) : (
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            {stationName ?? "Linked station"}
            {asOf && <> · as of {asOf}</>}
            {stale && <span className="ml-1 text-amber-600">(updating…)</span>}
          </p>
          {metrics.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              No reading received yet — tap Refresh.
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-lg bg-gray-50 p-2.5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {m.label}
                  </p>
                  <p className="text-base font-extrabold text-gray-900">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {energy.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {energy.map((m) => (
                <div key={m.label} className="rounded-lg border border-brand-green/20 bg-brand-green/5 p-2.5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {m.label}
                  </p>
                  <p className="text-base font-extrabold text-brand-green-dark">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {chart.length > 1 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-gray-500">
                Daily generation — last {chart.length} days (kWh)
              </p>
              <MonthlyBars data={chart} format={(v) => `${Math.round(v * 10) / 10}`} />
            </div>
          )}

          <a
            href={`/monitoring/${projectId}`}
            className="mt-3 block w-full rounded-lg border border-brand-green px-4 py-2.5 text-center text-sm font-semibold text-brand-green-dark active:bg-brand-green/5"
          >
            📊 Full station details — devices, alarms, monthly charts
          </a>

          {allReadings.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-gray-500">
                All measurements ({allReadings.length})
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                {allReadings.map((r) => (
                  <p key={r.label} className="flex justify-between gap-2 border-b border-gray-50 py-0.5">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="font-semibold text-gray-800">{r.value}</span>
                  </p>
                ))}
              </div>
            </details>
          )}
          {isOwner && (
            <button
              disabled={pending}
              onClick={() => {
                if (!confirm("Unlink this Deye station from the project?")) return;
                startTransition(async () => {
                  const res = await unlinkDeyeStation(projectId);
                  if (res.error) setError(res.error);
                  else router.refresh();
                });
              }}
              className="mt-2 text-xs text-gray-400 underline"
            >
              unlink station
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
