import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KpiScore } from "@/lib/kpi";
import { Scorecard, type Viewer } from "./scorecard";

export const metadata: Metadata = { title: "KPI Scorecard" };

export default async function KpiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") redirect("/login");

  const { id } = await params;
  const supabase = await createClient();

  // RLS scopes this: staff see all evaluations, an employee only their own.
  const { data: ev } = await supabase
    .from("kpi_evaluations")
    .select(
      "id, employee_id, employee_name, employee_position, period, supervisor_name, supervisor2_name, supervisor_employee_id, supervisor2_employee_id, status, scores, supervisor_comments, supervisor2_comments, manager_comments, development_plan, self_comments, self_submitted_at",
    )
    .eq("id", id)
    .single();
  if (!ev) notFound();

  // Whoever the evaluation is ABOUT gets the self-evaluation view, even if
  // they are office staff — nobody rates their own supervisor column. (The
  // admin client is needed because office staff cannot read employees.)
  const admin = createAdminClient();
  const { data: employee } = await admin
    .from("employees")
    .select("profile_id")
    .eq("id", ev.employee_id)
    .single();
  const isSelf = !!employee?.profile_id && employee.profile_id === profile.id;

  // A supervisor with a technician login sees the rating view for the
  // evaluations assigned to them, limited to their own column.
  const { data: myEmployees } = await admin
    .from("employees")
    .select("id")
    .eq("profile_id", profile.id);
  const myIds = new Set((myEmployees ?? []).map((e) => e.id));
  const isSup1 = !!ev.supervisor_employee_id && myIds.has(ev.supervisor_employee_id);
  const isSup2 = !!ev.supervisor2_employee_id && myIds.has(ev.supervisor2_employee_id);
  const isStaffRole = ["owner", "office_staff"].includes(profile.role);

  const viewer: Viewer = isSelf && profile.role !== "owner"
    ? "employee"
    : profile.role === "owner"
      ? "owner"
      : profile.role === "office_staff" || isSup1 || isSup2
        ? "staff"
        : "employee";
  const canRate = {
    sup: isStaffRole || isSup1,
    sup2: isStaffRole || isSup2,
    meta: isStaffRole,
  };

  // Older rows may predate the self column in the scores JSON.
  const scores = (ev.scores as KpiScore[]).map((s) => ({ ...s, self: s.self ?? null }));

  return (
    <>
      <TopBar title={`KPI · ${ev.employee_name}`} backHref="/kpi" />
      <Scorecard
        evaluation={{
          id: ev.id,
          employee_name: ev.employee_name,
          employee_position: ev.employee_position,
          period: ev.period,
          supervisor_name: ev.supervisor_name,
          supervisor2_name: ev.supervisor2_name ?? null,
          status: ev.status as "draft" | "supervisor_done" | "final",
          scores,
          supervisor_comments: ev.supervisor_comments,
          supervisor2_comments: ev.supervisor2_comments ?? null,
          manager_comments: ev.manager_comments,
          development_plan: ev.development_plan,
          self_comments: ev.self_comments,
          self_submitted_at: ev.self_submitted_at,
        }}
        viewer={viewer}
        canRate={canRate}
      />
    </>
  );
}
