import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  deyeEnabled,
  getCachedDetail,
  getCachedHistory,
  getCachedStation,
  type DeyeDaily,
} from "@/lib/deye";
import { MonthlyBars } from "@/components/charts";
import { StationDetailRefresher } from "./refresher";

export const metadata: Metadata = { title: "Station Detail" };

function monthlyFrom(daily: DeyeDaily[]): { label: string; value: number }[] {
  const byMonth = new Map<string, number>();
  for (const d of daily) {
    const m = d.date.slice(0, 7);
    byMonth.set(m, (byMonth.get(m) ?? 0) + d.kwh);
  }
  return [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([m, v]) => ({ label: m.slice(2).replace("-", "/"), value: Math.round(v * 10) / 10 }));
}

export default async function StationDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") redirect("/login");
  if (!deyeEnabled()) notFound();

  const { projectId } = await params;
  const supabase = await createClient();
  // RLS scopes this: technicians only reach assigned projects.
  const { data: project } = await supabase
    .from("projects")
    .select("id, project_no, deye_station_id, deye_station_name, customers (name)")
    .eq("id", projectId)
    .single();
  if (!project?.deye_station_id) notFound();
  const customer = Array.isArray(project.customers) ? project.customers[0] : project.customers;

  const ref = project.deye_station_id as string;
  const [latest, history, detailRow] = await Promise.all([
    getCachedStation(ref),
    getCachedHistory(ref),
    getCachedDetail(ref),
  ]);
  const detail = detailRow?.detail;
  const stale = !detailRow || detailRow.stale || !latest || latest.stale;

  const kW = (w: unknown): string =>
    typeof w === "number" ? `${Math.round((w / 1000) * 100) / 100} kW` : "—";
  const d = latest?.data ?? {};

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const daily365 = detail?.daily365 ?? [];
  const year = today.slice(0, 4);
  const sumWhere = (fn: (dd: DeyeDaily) => boolean) =>
    Math.round(daily365.filter(fn).reduce((s, i) => s + i.kwh, 0) * 10) / 10;
  const energyTiles = [
    { label: "Today", value: `${daily365.find((i) => i.date === today)?.kwh ?? history?.items.find((i) => i.date === today)?.kwh ?? 0} kWh` },
    { label: "This month", value: `${sumWhere((i) => i.date.slice(0, 7) === today.slice(0, 7))} kWh` },
    { label: `Year ${year}`, value: `${sumWhere((i) => i.date.slice(0, 4) === year)} kWh` },
    { label: "Last 365 days", value: `${sumWhere(() => true)} kWh` },
  ];

  const monthly = monthlyFrom(daily365);
  const last30 = history?.items ?? [];

  return (
    <>
      <TopBar title={project.deye_station_name ?? "Station"} backHref="/monitoring" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-gray-900">{project.deye_station_name}</p>
              <p className="text-xs text-gray-500">
                {project.project_no} · {(customer as { name?: string } | null)?.name}
              </p>
            </div>
            <StationDetailRefresher projectId={project.id} stale={stale} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Solar now", kW(d.generationPower)],
              ["Battery", typeof d.batterySOC === "number" ? `${d.batterySOC}%` : "—"],
              ["Grid", kW(d.gridPower ?? d.wirePower)],
              ["Load", kW(d.consumptionPower)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-gray-50 p-2.5 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                <p className="text-base font-extrabold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {energyTiles.map((t) => (
            <div key={t.label} className="rounded-xl border border-brand-green/20 bg-brand-green/5 p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{t.label}</p>
              <p className="text-lg font-extrabold text-brand-green-dark">{t.value}</p>
            </div>
          ))}
        </div>

        {(detail?.alarms?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="mb-2 font-semibold text-red-800">⚠ Alarms</p>
            <ul className="space-y-1 text-sm text-red-900">
              {detail!.alarms.slice(0, 10).map((a, i) => (
                <li key={i}>
                  {String(a.alarmName ?? a.name ?? a.showName ?? a.content ?? JSON.stringify(a)).slice(0, 200)}
                  {typeof a.startTime === "number" && (
                    <span className="ml-1 text-xs text-red-600">
                      · {new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" }).format(new Date(a.startTime * 1000))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {last30.length > 1 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">Daily generation — last 30 days (kWh)</p>
            <MonthlyBars
              data={last30.map((i) => ({ label: i.date.slice(5).replace("-", "/"), value: i.kwh }))}
              format={(v) => `${Math.round(v * 10) / 10}`}
            />
          </div>
        )}

        {monthly.length > 1 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">Monthly generation — last 12 months (kWh)</p>
            <MonthlyBars data={monthly} format={(v) => `${Math.round(v)}`} />
          </div>
        )}

        {(detail?.devices?.length ?? 0) > 0 ? (
          detail!.devices.map((dev) => (
            <div key={dev.sn} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-semibold text-gray-900">
                🔌 {dev.type} <span className="text-xs font-normal text-gray-400">SN {dev.sn}</span>
              </p>
              {dev.points.length === 0 ? (
                <p className="mt-1 text-sm text-gray-500">No live measure points returned.</p>
              ) : (
                <details className="mt-1" open={detail!.devices.length === 1}>
                  <summary className="cursor-pointer text-xs font-medium text-gray-500">
                    {dev.points.length} measure points
                  </summary>
                  <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
                    {dev.points.map((p) => (
                      <p key={p.key} className="flex justify-between gap-2 border-b border-gray-50 py-1">
                        <span className="min-w-0 truncate text-gray-500">{p.name || p.key}</span>
                        <span className="shrink-0 font-semibold text-gray-800">
                          {p.value}{p.unit && ` ${p.unit}`}
                        </span>
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))
        ) : (
          <p className="text-center text-xs text-gray-400">
            {detail?.errors?.devices
              ? `Device data unavailable: ${detail.errors.devices}`
              : "Device details load on first refresh."}
          </p>
        )}

        {detail?.errors?.alarms && (
          <p className="text-center text-xs text-gray-400">Alarms unavailable: {detail.errors.alarms}</p>
        )}
      </div>
    </>
  );
}
