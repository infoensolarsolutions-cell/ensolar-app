import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { KpiScore } from "@/lib/kpi";
import { Scorecard } from "./scorecard";

export const metadata: Metadata = { title: "KPI Scorecard" };

export default async function KpiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const { data: ev } = await supabase
    .from("kpi_evaluations")
    .select(
      "id, employee_name, employee_position, period, supervisor_name, status, scores, supervisor_comments, manager_comments, development_plan, finalized_at",
    )
    .eq("id", id)
    .single();
  if (!ev) notFound();

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
          scores: ev.scores as KpiScore[],
          supervisor_comments: ev.supervisor_comments,
          manager_comments: ev.manager_comments,
          development_plan: ev.development_plan,
        }}
        isOwner={profile.role === "owner"}
      />
    </>
  );
}
