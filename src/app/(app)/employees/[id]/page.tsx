import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toManilaLocalInput } from "@/lib/format";
import { entryHours, WORK_DEFAULTS, type WorkRules } from "@/lib/payroll";
import { EmployeeForm } from "../employee-form";
import { AttendanceAdmin, type AttendanceEntry } from "./attendance-admin";
import { LeavesPanel, type LeaveRow } from "./leaves-panel";
import { AdvancesPanel, type AdvanceRow } from "./advances-panel";

export const metadata: Metadata = { title: "Employee" };

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner");
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: employee },
    { data: attendance },
    { data: leaves },
    { data: advances },
    { data: profiles },
    { data: linked },
    { data: workSetting },
  ] = await Promise.all([
    supabase.from("employees").select("*").eq("id", id).single(),
    supabase
      .from("attendance")
      .select("id, clock_in, clock_out, source")
      .eq("employee_id", id)
      .order("clock_in", { ascending: false })
      .limit(30),
    supabase
      .from("leaves")
      .select("id, date_from, date_to, type, paid, note")
      .eq("employee_id", id)
      .order("date_from", { ascending: false })
      .limit(30),
    supabase
      .from("cash_advances")
      .select("id, amount, repaid, date, note")
      .eq("employee_id", id)
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("profiles")
      .select("id, name, role")
      .in("role", ["owner", "office_staff", "technician"])
      .eq("active", true)
      .order("name"),
    supabase.from("employees").select("id, profile_id").not("profile_id", "is", null),
    supabase.from("contribution_settings").select("config").eq("key", "work").maybeSingle(),
  ]);

  if (!employee) notFound();

  const taken = new Set(
    (linked ?? []).filter((l) => l.id !== id).map((l) => l.profile_id),
  );
  const linkable = (profiles ?? []).filter((p) => !taken.has(p.id));

  const rules: WorkRules = (workSetting?.config as WorkRules) ?? WORK_DEFAULTS;
  const entries: AttendanceEntry[] = (attendance ?? []).map((a) => {
    const split = entryHours(a.clock_in, a.clock_out, rules);
    return {
      id: a.id,
      clock_in: a.clock_in,
      clock_out: a.clock_out,
      clock_in_local: toManilaLocalInput(a.clock_in),
      clock_out_local: toManilaLocalInput(a.clock_out),
      source: a.source,
      hours: Math.round((split.regular + split.ot) * 100) / 100,
      ot: split.ot,
    };
  });

  return (
    <>
      <TopBar title={employee.name} backHref="/employees" />
      <EmployeeForm employee={employee} linkableProfiles={linkable} />
      <div className="space-y-4 px-4 pb-4">
        <AttendanceAdmin employeeId={id} entries={entries} />
        <LeavesPanel employeeId={id} leaves={(leaves ?? []) as LeaveRow[]} />
        <AdvancesPanel
          employeeId={id}
          advances={((advances ?? []) as AdvanceRow[]).map((a) => ({
            ...a,
            amount: Number(a.amount),
            repaid: Number(a.repaid),
          }))}
        />
      </div>
    </>
  );
}
