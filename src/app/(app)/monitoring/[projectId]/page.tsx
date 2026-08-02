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
} from "@/lib/deye";
import { MonthlyBars } from "@/components/charts";
import { DeyeEnergyChart, type EnergyBar } from "@/components/deye-energy-chart";
import { StationDetailRefresher } from "./refresher";

export const metadata: Metadata = { title: "Station Detail" };

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
  const monthly = detail?.monthly ?? [];
  const yearly = detail?.yearly ?? [];
  const last30 = history?.items ?? [];
  const r1 = (n: number) => Math.round(n * 10) / 10;

  const todayKwh = last30.find((i) => i.date === today)?.kwh ?? 0;
  const monthKwh =
    monthly.find((m) => m.month === today.slice(0, 7))?.kwh ??
    r1(last30.filter((i) => i.date.slice(0, 7) === today.slice(0, 7)).reduce((s, i) => s + i.kwh, 0));
  const yearKwh =
    yearly.find((y) => y.year === today.slice(0, 4))?.kwh ??
    r1(monthly.filter((m) => m.month.slice(0, 4) === today.slice(0, 4)).reduce((s, m) => s + m.kwh, 0));
  const lifetimeKwh = r1(yearly.reduce((s, y) => s + y.kwh, 0));

  const energyTiles = [
    { label: "Today", value: `${todayKwh} kWh` },
    { label: "This month", value: `${r1(monthKwh)} kWh` },
    { label: `Year ${today.slice(0, 4)}`, value: `${r1(yearKwh)} kWh` },
    { label: "Lifetime", value: `${lifetimeKwh} kWh` },
  ];

  // Device state → chip. Deye reports connect status codes/strings.
  const stateChip = (state: string | null) => {
    const s = (state ?? "").toLowerCase();
    if (["1", "online", "normal", "on"].includes(s))
      return { label: "● Online", cls: "bg-green-100 text-green-800" };
    if (["2", "alarm", "warn", "fault"].includes(s))
      return { label: "⚠ Alert", cls: "bg-red-100 text-red-700" };
    if (["0", "offline", "off"].includes(s))
      return { label: "○ Offline", cls: "bg-gray-200 text-gray-600" };
    return state ? { label: state, cls: "bg-gray-100 text-gray-600" } : null;
  };

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

        {last30.length > 1 && (() => {
          const bars: EnergyBar[] = last30.map((i) => ({
            label: i.date.slice(5).replace("-", "/"),
            production: i.kwh,
            discharge: i.discharge ?? 0,
            purchased: i.purchased ?? 0,
            charge: i.charge ?? 0,
            feedIn: i.feedIn ?? 0,
            consumption: i.consumption ?? 0,
          }));
          const hasBreakdown = bars.some(
            (b) => b.discharge || b.purchased || b.charge || b.feedIn || b.consumption,
          );
          return (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-2 font-semibold text-gray-900">
                Generation &amp; usage — last 30 days (kWh)
              </p>
              {hasBreakdown ? (
                <DeyeEnergyChart data={bars} />
              ) : (
                <MonthlyBars
                  data={bars.map((b) => ({ label: b.label, value: b.production }))}
                  format={(v) => `${Math.round(v * 10) / 10}`}
                />
              )}
            </div>
          );
        })()}

        {monthly.length > 1 && (() => {
          const bars: EnergyBar[] = monthly.map((m) => ({
            label: m.month.slice(2).replace("-", "/"),
            production: m.kwh,
            discharge: m.discharge ?? 0,
            purchased: m.purchased ?? 0,
            charge: m.charge ?? 0,
            feedIn: m.feedIn ?? 0,
            consumption: m.consumption ?? 0,
          }));
          const hasBreakdown = bars.some(
            (b) => b.discharge || b.purchased || b.charge || b.feedIn || b.consumption,
          );
          return (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-2 font-semibold text-gray-900">
                Generation &amp; usage — last 12 months (kWh)
              </p>
              {hasBreakdown ? (
                <DeyeEnergyChart data={bars} />
              ) : (
                <MonthlyBars
                  data={bars.map((b) => ({ label: b.label, value: b.production }))}
                  format={(v) => `${Math.round(v)}`}
                />
              )}
            </div>
          );
        })()}

        {yearly.length > 1 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">Generation by year (kWh)</p>
            <MonthlyBars
              data={yearly.map((y) => ({ label: y.year, value: y.kwh }))}
              format={(v) => `${Math.round(v)}`}
            />
          </div>
        )}

        {(detail?.devices?.length ?? 0) > 0 ? (
          detail!.devices.map((dev) => {
            const chip = stateChip(dev.state);
            return (
              <div key={dev.sn} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900">
                    🔌 {dev.type} <span className="text-xs font-normal text-gray-400">SN {dev.sn}</span>
                  </p>
                  {chip && (
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${chip.cls}`}>
                      {chip.label}
                    </span>
                  )}
                </div>
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
            );
          })
        ) : (
          <p className="text-center text-xs text-gray-400">
            {detail?.errors?.devices
              ? `Device data unavailable: ${detail.errors.devices}`
              : "Device details load on first refresh."}
          </p>
        )}

        {(detail?.errors?.monthly || detail?.errors?.yearly) && (
          <p className="text-center text-xs text-gray-400">
            Some history unavailable: {detail?.errors?.monthly ?? detail?.errors?.yearly}
          </p>
        )}
      </div>
    </>
  );
}
