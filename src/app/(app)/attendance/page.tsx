import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayManila } from "@/lib/format";
import { ClockWidget } from "./clock-widget";

export const metadata: Metadata = { title: "Attendance" };

function fmtTime(ts: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
  }).format(new Date(ts));
}

function hoursBetween(a: string, b: string): string {
  return ((new Date(b).getTime() - new Date(a).getTime()) / 3600000).toFixed(1);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") redirect("/login");
  const supabase = await createClient();
  const { d } = await searchParams;

  const { data: employee } = await supabase
    .from("employees")
    .select("id, name, position")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const teamPanel =
    profile.role === "owner" ? await TeamAttendance({ day: d }) : null;

  if (!employee) {
    return (
      <>
        <TopBar title="Attendance" backHref="/more" />
        <div className="space-y-4 p-4">
          {teamPanel ?? (
            <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
              No employee record is linked to your account yet. Ask the owner to
              add you under More → Employees.
            </p>
          )}
        </div>
      </>
    );
  }

  const { data: entries } = await supabase
    .from("attendance")
    .select("id, clock_in, clock_out")
    .eq("employee_id", employee.id)
    .order("clock_in", { ascending: false })
    .limit(14);

  const open = entries?.find((e) => e.clock_out === null);

  return (
    <>
      <TopBar title="Attendance" backHref="/more" />
      <div className="space-y-4 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        <ClockWidget openSince={open?.clock_in ?? null} />

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 font-semibold text-gray-900">Recent entries</p>
          {!entries?.length && (
            <p className="text-sm text-gray-500">No attendance yet.</p>
          )}
          <ul className="divide-y divide-gray-100">
            {entries?.map((e) => (
              <li key={e.id} className="flex justify-between py-2 text-sm">
                <span className="text-gray-700">{formatDate(e.clock_in)}</span>
                <span className="font-medium text-gray-900">
                  {fmtTime(e.clock_in)} –{" "}
                  {e.clock_out ? fmtTime(e.clock_out) : "…"}
                  {e.clock_out && (
                    <span className="ml-1.5 text-xs text-gray-500">
                      ({hoursBetween(e.clock_in, e.clock_out)}h)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {teamPanel}
      </div>
    </>
  );
}

// Owner-only day view of the whole team's punches.
async function TeamAttendance({ day }: { day?: string }) {
  const date = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : todayManila();
  const startIso = new Date(`${date}T00:00:00+08:00`).toISOString();
  const endIso = new Date(new Date(startIso).getTime() + 86400000).toISOString();

  const supabase = await createClient();
  const [{ data: employees }, { data: entries }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, name, position")
      .eq("active", true)
      .order("name"),
    supabase
      .from("attendance")
      .select("id, employee_id, clock_in, clock_out, source")
      .gte("clock_in", startIso)
      .lt("clock_in", endIso)
      .order("clock_in"),
  ]);

  const byEmployee = new Map<string, NonNullable<typeof entries>>();
  for (const e of entries ?? []) {
    const list = byEmployee.get(e.employee_id) ?? [];
    list.push(e);
    byEmployee.set(e.employee_id, list);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-gray-900">All employees</p>
        <form action="/attendance" className="flex items-center gap-2">
          <input
            name="d"
            type="date"
            defaultValue={date}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
          />
          <button className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-semibold text-white">
            View
          </button>
        </form>
      </div>
      {!employees?.length && (
        <p className="text-sm text-gray-500">No active employees yet.</p>
      )}
      <ul className="divide-y divide-gray-100">
        {employees?.map((emp) => {
          const rows = byEmployee.get(emp.id) ?? [];
          const totalH = rows.reduce(
            (s, r) =>
              s +
              (r.clock_out
                ? (new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 3600000
                : 0),
            0,
          );
          const stillIn = rows.some((r) => !r.clock_out);
          return (
            <li key={emp.id} className="flex items-start justify-between gap-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-gray-800">{emp.name}</p>
                <p className="text-xs text-gray-500">
                  {rows.length === 0
                    ? "No entry"
                    : rows
                        .map(
                          (r) =>
                            `${fmtTime(r.clock_in)}–${r.clock_out ? fmtTime(r.clock_out) : "…"}${
                              r.source === "kiosk" ? " 🖥️" : ""
                            }`,
                        )
                        .join(", ")}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                  stillIn
                    ? "bg-green-100 text-green-800"
                    : rows.length
                      ? "bg-gray-100 text-gray-700"
                      : "bg-red-50 text-red-600"
                }`}
              >
                {stillIn ? "IN NOW" : rows.length ? `${totalH.toFixed(1)}h` : "ABSENT"}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-gray-400">
        🖥️ = punched at the office kiosk. Hours shown are raw clocked time;
        payroll applies the 8AM–5PM rules automatically.
      </p>
    </div>
  );
}
