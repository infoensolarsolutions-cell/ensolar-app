import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { ClockWidget } from "./clock-widget";

export const metadata: Metadata = { title: "My Attendance" };

function fmtTime(ts: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
  }).format(new Date(ts));
}

function hoursBetween(a: string, b: string): string {
  return ((new Date(b).getTime() - new Date(a).getTime()) / 3600000).toFixed(1);
}

export default async function AttendancePage() {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") redirect("/login");
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("id, name, position")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!employee) {
    return (
      <>
        <TopBar title="My Attendance" backHref="/more" />
        <div className="p-4">
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            No employee record is linked to your account yet. Ask the owner to
            add you under More → Employees.
          </p>
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
      <TopBar title="My Attendance" backHref="/more" />
      <div className="space-y-4 p-4">
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
      </div>
    </>
  );
}
