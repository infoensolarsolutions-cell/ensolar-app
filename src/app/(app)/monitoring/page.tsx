import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deyeEnabled, getCachedStation } from "@/lib/deye";
import { RefreshAllButton } from "./refresh-all";

export const metadata: Metadata = { title: "Solar Monitoring" };

type Row = {
  projectId: string;
  project_no: string;
  customer: string;
  station: string;
  powerKw: number | null;
  batteryPct: number | null;
  asOf: string | null;
  status: "producing" | "idle" | "offline" | "no-data";
};

export default async function MonitoringPage() {
  await requireRole("owner", "office_staff");

  if (!deyeEnabled()) {
    return (
      <>
        <TopBar title="Solar Monitoring" backHref="/more" />
        <p className="p-4 text-sm text-gray-500">
          Deye Cloud is not configured — add the DEYE environment variables in
          Vercel to enable monitoring.
        </p>
      </>
    );
  }

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, project_no, deye_station_id, deye_station_name, customers (name)")
    .not("deye_station_id", "is", null)
    .order("project_no");

  const rows: Row[] = [];
  for (const p of projects ?? []) {
    const customer = Array.isArray(p.customers) ? p.customers[0] : p.customers;
    const cached = await getCachedStation(p.deye_station_id as string);
    let status: Row["status"] = "no-data";
    let powerKw: number | null = null;
    let batteryPct: number | null = null;
    let asOf: string | null = null;
    if (cached) {
      const d = cached.data;
      powerKw =
        typeof d.generationPower === "number"
          ? Math.round((d.generationPower / 1000) * 100) / 100
          : null;
      batteryPct = typeof d.batterySOC === "number" ? d.batterySOC : null;
      const updatedMs =
        typeof d.lastUpdateTime === "number"
          ? d.lastUpdateTime * 1000
          : new Date(cached.fetchedAt).getTime();
      asOf = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      }).format(new Date(updatedMs));
      // No report for over an hour = probably offline (datalogger/wifi down).
      status =
        Date.now() - updatedMs > 60 * 60 * 1000
          ? "offline"
          : (powerKw ?? 0) > 0.1
            ? "producing"
            : "idle";
    }
    rows.push({
      projectId: p.id,
      project_no: p.project_no,
      customer: (customer as { name?: string } | null)?.name ?? "—",
      station: (p.deye_station_name as string) ?? "Station",
      powerKw,
      batteryPct,
      asOf,
      status,
    });
  }

  const badge: Record<Row["status"], { label: string; cls: string }> = {
    producing: { label: "☀️ Producing", cls: "bg-green-100 text-green-800" },
    idle: { label: "🌙 Idle", cls: "bg-gray-100 text-gray-600" },
    offline: { label: "⚠ Offline?", cls: "bg-red-100 text-red-700" },
    "no-data": { label: "No data yet", cls: "bg-gray-100 text-gray-500" },
  };

  const offline = rows.filter((r) => r.status === "offline").length;

  return (
    <>
      <TopBar title="Solar Monitoring" backHref="/more" />
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            {rows.length} linked station{rows.length === 1 ? "" : "s"}
            {offline > 0 && (
              <span className="ml-2 font-bold text-red-600">
                · ⚠ {offline} possibly offline
              </span>
            )}
          </p>
          <RefreshAllButton />
        </div>

        {rows.length === 0 && (
          <p className="pt-6 text-center text-sm text-gray-500">
            No stations linked yet. Open a project and link its Deye station
            from the Live Monitoring panel.
          </p>
        )}

        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 xl:grid-cols-3">
          {rows.map((r) => (
            <Link
              key={r.projectId}
              href={`/projects/${r.projectId}`}
              className="block rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{r.station}</p>
                  <p className="text-xs text-gray-500">
                    {r.project_no} · {r.customer}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badge[r.status].cls}`}>
                  {badge[r.status].label}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="font-bold text-gray-900">
                  {r.powerKw !== null ? `${r.powerKw} kW` : "—"}
                  {r.batteryPct !== null && (
                    <span className="ml-2 font-medium text-gray-500">🔋 {r.batteryPct}%</span>
                  )}
                </span>
                <span className="text-xs text-gray-400">{r.asOf ?? ""}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
