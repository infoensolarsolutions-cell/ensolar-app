"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  linkDeyeStation,
  unlinkDeyeStation,
  refreshDeyeData,
} from "../deye-actions";

type Metric = { label: string; value: string };

export function DeyePanel({
  projectId,
  isOwner,
  stationName,
  linked,
  stations,
  stationsError,
  metrics,
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
