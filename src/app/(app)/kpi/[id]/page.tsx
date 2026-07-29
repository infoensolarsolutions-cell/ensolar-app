import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
  const viewer: Viewer =
    profile.role === "owner" ? "owner" : profile.role === "office_staff" ? "staff" : "employee";

  const { id } = await params;
  const supabase = await createClient();

  // RLS scopes this: staff see all evaluations, an employee only their own.
  const { data: ev } = await supabase
    .from("kpi_evaluations")
    .select(
      "id, employee_name, employee_position, period, supervisor_name, status, scores, supervisor_comments, manager_comments, development_plan, self_comments, self_submitted_at",
    )
    .eq("id", id)
    .single();
  if (!ev) notFound();

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
          status: ev.status as "draft" | "supervisor_done" | "final",
          scores,
          supervisor_comments: ev.supervisor_comments,
          manager_comments: ev.manager_comments,
          development_plan: ev.development_plan,
          self_comments: ev.self_comments,
          self_submitted_at: ev.self_submitted_at,
        }}
        viewer={viewer}
      />
    </>
  );
}
