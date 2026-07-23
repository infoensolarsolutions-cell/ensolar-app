import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayManila, TIMEZONE } from "@/lib/format";
import { entryHours, fmtHours, WORK_DEFAULTS, type WorkRules } from "@/lib/payroll";

export const metadata: Metadata = { title: "Weekly Attendance" };

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mondayOf(date: string): string {
  const noon = new Date(`${date}T12:00:00Z`);
  const dow = (noon.getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

function fmtTime(ts: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric", minute: "2-digit", hour12: false, timeZone: TIMEZONE,
  }).format(new Date(ts));
}

type Entry = {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  source: string;
  auto_clocked_out: boolean;
};

export default async function WeeklyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || !["owner", "office_staff"].includes(profile.role)) {
    redirect("/attendance");
  }
  const { w } = await searchParams;
  const monday = mondayOf(
    w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? w : todayManila(),
  );
  const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const startIso = new Date(`${monday}T00:00:00+08:00`).toISOString();
  const endIso = new Date(`${addDays(monday, 7)}T00:00:00+08:00`).toISOString();

  const supabase = await createClient();
  const [{ data: directory }, { data: entries }, { data: workSetting }] =
    await Promise.all([
      supabase.rpc("employee_directory"),
      supabase
        .from("attendance")
        .select("id, employee_id, clock_in, clock_out, source, auto_clocked_out")
        .gte("clock_in", startIso)
        .lt("clock_in", endIso)
        .order("clock_in")
        .overrideTypes<Entry[]>(),
      supabase
        .from("contribution_settings")
        .select("config")
        .eq("key", "work")
        .maybeSingle(),
    ]);
  const employees = (directory ?? []) as { id: string; name: string }[];
  const rules: WorkRules = (workSetting?.config as WorkRules) ?? WORK_DEFAULTS;

  const dayTotals = (list: Entry[]): { regular: number; ot: number } => {
    let regular = 0;
    let ot = 0;
    for (const e of list) {
      const h = entryHours(e.clock_in, e.clock_out, rules);
      regular += h.regular;
      ot += h.ot;
    }
    return { regular, ot };
  };

  const dayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  });
  // employee -> day -> entries
  const grid = new Map<string, Map<string, Entry[]>>();
  for (const e of entries ?? []) {
    const day = dayFmt.format(new Date(e.clock_in));
    if (!grid.has(e.employee_id)) grid.set(e.employee_id, new Map());
    const byDay = grid.get(e.employee_id)!;
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }

  const weekHours = (empId: string): { regular: number; ot: number } => {
    let regular = 0;
    let ot = 0;
    for (const list of grid.get(empId)?.values() ?? []) {
      const t = dayTotals(list);
      regular += t.regular;
      ot += t.ot;
    }
    return { regular, ot };
  };

  return (
    <>
      <TopBar title="Weekly Attendance" backHref="/attendance" />
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/attendance" className="text-sm font-medium text-brand-green-dark">
            ← Day view
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/attendance/week?w=${addDays(monday, -7)}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 active:bg-gray-50"
            >
              ‹ Prev
            </Link>
            <span className="font-semibold text-gray-900">
              {formatDate(monday)} – {formatDate(addDays(monday, 5))}
            </span>
            <Link
              href={`/attendance/week?w=${addDays(monday, 7)}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 active:bg-gray-50"
            >
              Next ›
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-gray-400">
                <th className="px-3 py-3 font-semibold">Employee</th>
                {days.map((d, i) => (
                  <th key={d} className="px-2 py-3 text-center font-semibold">
                    <Link href={`/attendance?d=${d}`} className="hover:underline">
                      {DAY_LABELS[i]}
                      <span className="block text-[10px] font-normal normal-case">
                        {d.slice(5).replace("-", "/")}
                      </span>
                    </Link>
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                    No active employees yet.
                  </td>
                </tr>
              )}
              {employees.map((emp) => (
                <tr key={emp.id} className="align-top hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-semibold text-gray-800">{emp.name}</td>
                  {days.map((d) => {
                    const list = grid.get(emp.id)?.get(d) ?? [];
                    const t = dayTotals(list);
                    return (
                      <td key={d} className="px-2 py-2.5 text-center text-xs">
                        {list.length === 0 && <span className="text-gray-300">—</span>}
                        {list.map((e) => (
                          <span key={e.id} className="block whitespace-nowrap text-gray-700">
                            {fmtTime(e.clock_in)}–{e.clock_out ? fmtTime(e.clock_out) : "…"}
                            {e.source === "kiosk" && " 🖥️"}
                            {e.auto_clocked_out && (
                              <span className="ml-0.5 rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">
                                A
                              </span>
                            )}
                          </span>
                        ))}
                        {(t.regular > 0 || t.ot > 0) && (
                          <span className="mt-0.5 block font-bold text-gray-900">
                            {fmtHours(t.regular)}h
                            {t.ot > 0 && (
                              <span className="font-semibold text-amber-700">
                                {" "}+{fmtHours(t.ot)} OT
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {(() => {
                    const t = weekHours(emp.id);
                    return (
                      <td className="px-3 py-2.5 text-right font-bold text-gray-900">
                        {t.regular > 0 || t.ot > 0 ? (
                          <>
                            {fmtHours(t.regular)}h
                            {t.ot > 0 && (
                              <span className="block text-xs font-semibold text-amber-700">
                                +{fmtHours(t.ot)} OT
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400">
          Times are 24-hour format. 🖥️ = kiosk punch · A = auto clock-out at
          5 PM (open the day view to fix the actual time) · &ldquo;…&rdquo; =
          still clocked in. Hour totals are payable hours: counted from 8:00 AM
          regardless of early clock-in, cut at 5:00 PM (clock-outs up to 5:30 PM
          count as 5:00 PM), lunch hour deducted — a full day is 8h. OT is time
          beyond 5:30 PM, counted from 5:00 PM.
        </p>
      </div>
    </>
  );
}
