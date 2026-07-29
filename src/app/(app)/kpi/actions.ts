"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { emptyScores, isComplete, type KpiScore } from "@/lib/kpi";

export async function createEvaluation(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const employeeId = String(formData.get("employee_id") ?? "");
  const employeeName = String(formData.get("employee_name") ?? "").trim().slice(0, 200);
  const employeePosition = String(formData.get("employee_position") ?? "").trim().slice(0, 120) || null;
  const period = String(formData.get("period") ?? "").trim().slice(0, 60);
  const supervisorName = String(formData.get("supervisor_name") ?? "").trim().slice(0, 200) || null;

  if (!employeeId || !employeeName) return { error: "Pick an employee." };
  if (!period) return { error: "Evaluation period is required (e.g. Q3 2026)." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("kpi_evaluations")
    .insert({
      employee_id: employeeId,
      employee_name: employeeName,
      employee_position: employeePosition,
      period,
      supervisor_name: supervisorName,
      scores: emptyScores(),
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: `Could not create: ${error?.message}` };

  revalidatePath("/kpi");
  redirect(`/kpi/${created.id}`);
}

// Parse and clamp a scores payload from the client, keeping only the fields
// this role may write. Manager ratings are owner-only.
function mergeScores(
  current: KpiScore[],
  incoming: unknown,
  isOwner: boolean,
): KpiScore[] | null {
  if (!Array.isArray(incoming)) return null;
  const byKey = new Map(
    incoming.map((s: { key?: string; sup?: unknown; mgr?: unknown }) => [String(s.key), s]),
  );
  return current.map((s) => {
    const inc = byKey.get(s.key);
    const clamp = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
    };
    return {
      ...s,
      sup: inc && "sup" in inc ? clamp(inc.sup) : s.sup,
      mgr: isOwner && inc && "mgr" in inc ? clamp(inc.mgr) : s.mgr,
    };
  });
}

export async function saveEvaluation(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const isOwner = profile.role === "owner";
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  const intent = String(formData.get("intent") ?? "save"); // save | submit_supervisor | finalize | reopen

  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("kpi_evaluations")
    .select("id, status, scores")
    .eq("id", evaluationId)
    .single();
  if (!ev) return { error: "Evaluation not found." };

  if (intent === "reopen") {
    if (!isOwner) return { error: "Only the owner can reopen a finalized evaluation." };
    const { error } = await supabase
      .from("kpi_evaluations")
      .update({ status: "supervisor_done", finalized_by: null, finalized_at: null })
      .eq("id", evaluationId);
    if (error) return { error: `Could not reopen: ${error.message}` };
    revalidatePath(`/kpi/${evaluationId}`);
    revalidatePath("/kpi");
    return { saved: true };
  }

  if (ev.status === "final") {
    return { error: "This evaluation is finalized — reopen it first (owner only)." };
  }

  let scoresJson: unknown;
  try {
    scoresJson = JSON.parse(String(formData.get("scores") ?? "[]"));
  } catch {
    return { error: "Invalid scores." };
  }
  const scores = mergeScores(ev.scores as KpiScore[], scoresJson, isOwner);
  if (!scores) return { error: "Invalid scores." };

  const updates: Record<string, unknown> = {
    scores,
    supervisor_name: String(formData.get("supervisor_name") ?? "").trim().slice(0, 200) || null,
    supervisor_comments: String(formData.get("supervisor_comments") ?? "").trim().slice(0, 2000) || null,
  };
  if (isOwner) {
    updates.manager_comments = String(formData.get("manager_comments") ?? "").trim().slice(0, 2000) || null;
    updates.development_plan = String(formData.get("development_plan") ?? "").trim().slice(0, 2000) || null;
  }

  if (intent === "submit_supervisor") {
    if (!isComplete(scores, "sup")) {
      return { error: "Rate all 10 criteria in the supervisor column first." };
    }
    updates.status = "supervisor_done";
  } else if (intent === "finalize") {
    if (!isOwner) return { error: "Only the owner can finalize." };
    if (!isComplete(scores, "sup") || !isComplete(scores, "mgr")) {
      return { error: "Both the supervisor and manager columns must be fully rated before finalizing." };
    }
    updates.status = "final";
    updates.finalized_by = profile.id;
    updates.finalized_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("kpi_evaluations")
    .update(updates)
    .eq("id", evaluationId);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath(`/kpi/${evaluationId}`);
  revalidatePath("/kpi");
  return { saved: true };
}

export async function deleteEvaluation(id: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { error } = await supabase.from("kpi_evaluations").delete().eq("id", id);
  if (error) return { error: `Could not delete: ${error.message}` };
  revalidatePath("/kpi");
  redirect("/kpi");
}
