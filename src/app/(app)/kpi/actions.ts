"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getProfile, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emptyScores, isComplete, RATING_MAX, RATING_MIN, type KpiScore } from "@/lib/kpi";

function clampRating(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= RATING_MIN && n <= RATING_MAX ? n : null;
}

export async function createEvaluation(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const employeeId = String(formData.get("employee_id") ?? "");
  const employeeName = String(formData.get("employee_name") ?? "").trim().slice(0, 200);
  const employeePosition = String(formData.get("employee_position") ?? "").trim().slice(0, 120) || null;
  const period = String(formData.get("period") ?? "").trim().slice(0, 60);
  // Supervisors come as employee ids so their app logins gain access to
  // rate; names are resolved server-side for display.
  const supervisorEmployeeId = String(formData.get("supervisor_employee_id") ?? "") || null;
  const supervisor2EmployeeId = String(formData.get("supervisor2_employee_id") ?? "") || null;

  if (!employeeId || !employeeName) return { error: "Pick an employee." };
  if (supervisorEmployeeId === employeeId || supervisor2EmployeeId === employeeId) {
    return { error: "An employee cannot be their own supervisor." };
  }
  if (supervisor2EmployeeId && supervisor2EmployeeId === supervisorEmployeeId) {
    return { error: "The two supervisors must be different people." };
  }

  const adminLookup = createAdminClient();
  const supIds = [supervisorEmployeeId, supervisor2EmployeeId].filter((x): x is string => !!x);
  const { data: sups } = supIds.length
    ? await adminLookup.from("employees").select("id, name, profile_id").in("id", supIds)
    : { data: [] as { id: string; name: string; profile_id: string | null }[] };
  const supByld = new Map((sups ?? []).map((s) => [s.id, s]));
  const supervisorName = supervisorEmployeeId
    ? (supByld.get(supervisorEmployeeId)?.name ?? null)
    : null;
  const supervisor2Name = supervisor2EmployeeId
    ? (supByld.get(supervisor2EmployeeId)?.name ?? null)
    : null;
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
      supervisor2_name: supervisor2Name,
      supervisor_employee_id: supervisorEmployeeId,
      supervisor2_employee_id: supervisor2EmployeeId,
      scores: emptyScores(),
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: `Could not create: ${error?.message}` };

  // Tell the member their self-evaluation is ready, via in-app chat.
  // (Admin client: office staff cannot read the employees table directly.)
  const admin = createAdminClient();
  const { data: employee } = await admin
    .from("employees")
    .select("profile_id")
    .eq("id", employeeId)
    .single();
  if (employee?.profile_id && employee.profile_id !== profile.id) {
    await supabase.from("messages").insert({
      sender_id: profile.id,
      recipient_id: employee.profile_id,
      body: `📈 Your KPI self-evaluation for ${period} is ready. Please open "My KPI" in the app menu and rate yourself on the 10 items, then press "Submit my self-evaluation". Thank you!`,
    });
  }
  // Notify the assigned supervisors too, if their logins are linked.
  for (const sup of sups ?? []) {
    if (sup.profile_id && sup.profile_id !== profile.id) {
      await supabase.from("messages").insert({
        sender_id: profile.id,
        recipient_id: sup.profile_id,
        body: `📈 You are assigned as supervisor for ${employeeName}'s KPI evaluation (${period}). Please open "KPI Evaluations" in the app menu to rate your column.`,
      });
    }
  }

  revalidatePath("/kpi");
  redirect(`/kpi/${created.id}`);
}

// Parse and clamp a scores payload from the client, keeping only the fields
// this caller may write: staff edit both supervisor columns, an assigned
// supervisor only their own, and manager ratings are owner-only.
function mergeScores(
  current: KpiScore[],
  incoming: unknown,
  allow: { sup: boolean; sup2: boolean; mgr: boolean },
): KpiScore[] | null {
  if (!Array.isArray(incoming)) return null;
  const byKey = new Map(
    incoming.map((s: { key?: string; sup?: unknown; sup2?: unknown; mgr?: unknown }) => [String(s.key), s]),
  );
  return current.map((s) => {
    const inc = byKey.get(s.key);
    return {
      ...s,
      self: s.self ?? null,
      sup: allow.sup && inc && "sup" in inc ? clampRating(inc.sup) : s.sup,
      sup2: allow.sup2 && inc && "sup2" in inc ? clampRating(inc.sup2) : (s.sup2 ?? null),
      mgr: allow.mgr && inc && "mgr" in inc ? clampRating(inc.mgr) : s.mgr,
    };
  });
}

// The employee's own step: rate the Self column and self comments on their
// evaluation. Identity is verified against employees.profile_id via the
// admin client (office staff cannot read the employees table directly).
export async function saveSelfEvaluation(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await getProfile();
  if (!profile) return { error: "Not signed in." };
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  const intent = String(formData.get("intent") ?? "save"); // save | submit_self

  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("kpi_evaluations")
    .select("id, status, scores, employee_id")
    .eq("id", evaluationId)
    .single();
  if (!ev) return { error: "Evaluation not found." };
  if (ev.status === "final") {
    return { error: "This evaluation is finalized — the self-evaluation is closed." };
  }

  const admin = createAdminClient();
  const { data: employee } = await admin
    .from("employees")
    .select("profile_id")
    .eq("id", ev.employee_id)
    .single();
  if (!employee || employee.profile_id !== profile.id) {
    return { error: "Only the evaluated employee can fill in the self-evaluation." };
  }

  let incoming: unknown;
  try {
    incoming = JSON.parse(String(formData.get("scores") ?? "[]"));
  } catch {
    return { error: "Invalid scores." };
  }
  if (!Array.isArray(incoming)) return { error: "Invalid scores." };
  const byKey = new Map(
    incoming.map((s: { key?: string; self?: unknown }) => [String(s.key), s]),
  );
  const scores = (ev.scores as KpiScore[]).map((s) => {
    const inc = byKey.get(s.key);
    return { ...s, self: inc && "self" in inc ? clampRating(inc.self) : (s.self ?? null) };
  });

  const updates: Record<string, unknown> = {
    scores,
    self_comments: String(formData.get("self_comments") ?? "").trim().slice(0, 2000) || null,
  };
  if (intent === "submit_self") {
    if (!isComplete(scores, "self")) {
      return { error: "Rate all 10 criteria first." };
    }
    updates.self_submitted_at = new Date().toISOString();
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

export async function saveEvaluation(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await getProfile();
  if (!profile) return { error: "Not signed in." };
  const isOwner = profile.role === "owner";
  const isStaff = ["owner", "office_staff"].includes(profile.role);
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  const intent = String(formData.get("intent") ?? "save"); // save | submit_supervisor | finalize | reopen

  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("kpi_evaluations")
    .select("id, status, scores, employee_id, supervisor_employee_id, supervisor2_employee_id")
    .eq("id", evaluationId)
    .single();
  if (!ev) return { error: "Evaluation not found." };

  // Which supervisor slot does this caller hold (if any)?
  let isSup1 = false;
  let isSup2 = false;
  {
    const admin = createAdminClient();
    const { data: mine } = await admin
      .from("employees")
      .select("id")
      .eq("profile_id", profile.id);
    const myIds = new Set((mine ?? []).map((e) => e.id));
    isSup1 = !!ev.supervisor_employee_id && myIds.has(ev.supervisor_employee_id);
    isSup2 = !!ev.supervisor2_employee_id && myIds.has(ev.supervisor2_employee_id);
  }
  if (!isStaff && !isSup1 && !isSup2) {
    return { error: "Only office staff or the assigned supervisors can rate this evaluation." };
  }

  // Nobody rates their own supervisor/manager columns: whoever is the
  // evaluated employee must use the self-evaluation view instead.
  if (!isOwner) {
    const admin = createAdminClient();
    const { data: employee } = await admin
      .from("employees")
      .select("profile_id")
      .eq("id", ev.employee_id)
      .single();
    if (employee?.profile_id === profile.id) {
      return { error: "This is your own evaluation — use the self-evaluation view. Supervisor ratings must come from someone else." };
    }
  }

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
  const scores = mergeScores(ev.scores as KpiScore[], scoresJson, {
    sup: isStaff || isSup1,
    sup2: isStaff || isSup2,
    mgr: isOwner,
  });
  if (!scores) return { error: "Invalid scores." };

  const supervisor2Name = String(formData.get("supervisor2_name") ?? "").trim().slice(0, 200) || null;
  // Does a second supervisor exist after this save? Staff may clear the slot;
  // supervisors themselves cannot change assignments.
  const hasSup2 = isStaff ? !!supervisor2Name : !!ev.supervisor2_employee_id;
  const updates: Record<string, unknown> = { scores };
  if (isStaff) {
    updates.supervisor_name = String(formData.get("supervisor_name") ?? "").trim().slice(0, 200) || null;
    updates.supervisor2_name = supervisor2Name;
    if (!supervisor2Name) updates.supervisor2_employee_id = null;
  }
  if (isStaff || isSup1) {
    updates.supervisor_comments = String(formData.get("supervisor_comments") ?? "").trim().slice(0, 2000) || null;
  }
  if (isStaff || isSup2) {
    updates.supervisor2_comments = String(formData.get("supervisor2_comments") ?? "").trim().slice(0, 2000) || null;
  }
  if (isOwner) {
    updates.manager_comments = String(formData.get("manager_comments") ?? "").trim().slice(0, 2000) || null;
    updates.development_plan = String(formData.get("development_plan") ?? "").trim().slice(0, 2000) || null;
  }

  if (intent === "submit_supervisor") {
    if (!isComplete(scores, "sup")) {
      return { error: "Rate all 10 criteria in the supervisor column first." };
    }
    if (hasSup2 && !isComplete(scores, "sup2")) {
      return { error: "Supervisor 2 must also rate all 10 criteria before submitting — or office staff can clear the second supervisor." };
    }
    updates.status = "supervisor_done";
  } else if (intent === "finalize") {
    if (!isOwner) return { error: "Only the owner can finalize." };
    if (!isComplete(scores, "sup") || !isComplete(scores, "mgr")) {
      return { error: "Both the supervisor and manager columns must be fully rated before finalizing." };
    }
    if (hasSup2 && !isComplete(scores, "sup2")) {
      return { error: "Supervisor 2 has not rated all criteria — complete them or clear the second supervisor's name." };
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
