import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { EmployeeForm } from "../employee-form";

export const metadata: Metadata = { title: "Employee" };

function fmtTime(ts: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
  }).format(new Date(ts));
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: employee }, { data: attendance }, { data: profiles }, { data: linked }] =
    await Promise.all([
      supabase.from("employees").select("*").eq("id", id).single(),
      supabase
        .from("attendance")
        .select("id, clock_in, clock_out, source")
        .eq("employee_id", id)
        .order("clock_in", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("id, name, role")
        .in("role", ["owner", "office_staff", "technician"])
        .eq("active", true)
        .order("name"),
      supabase.from("employees").select("id, profile_id").not("profile_id", "is", null),
    ]);

  if (!employee) notFound();

  const taken = new Set(
    (linked ?? []).filter((l) => l.id !== id).map((l) => l.profile_id),
  );
  const linkable = (profiles ?? []).filter((p) => !taken.has(p.id));

  return (
    <>
      <TopBar title={employee.name} backHref="/employees" />
      <EmployeeForm employee={employee} linkableProfiles={linkable} />
      <div className="px-4 pb-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 font-semibold text-gray-900">Recent attendance</p>
          {!attendance?.length && (
            <p className="text-sm text-gray-500">No attendance records.</p>
          )}
          <ul className="divide-y divide-gray-100">
            {attendance?.map((a) => (
              <li key={a.id} className="flex justify-between py-2 text-sm">
                <span className="text-gray-700">
                  {formatDate(a.clock_in)}
                  {a.source === "admin" && (
                    <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      corrected
                    </span>
                  )}
                </span>
                <span className="font-medium">
                  {fmtTime(a.clock_in)} – {a.clock_out ? fmtTime(a.clock_out) : "…"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
