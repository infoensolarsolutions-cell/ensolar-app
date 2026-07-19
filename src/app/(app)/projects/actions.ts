"use server";

import { revalidatePath } from "next/cache";
import { getProfile, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/crm";

const FLOW: Record<string, ProjectStatus[]> = {
  pending: ["ongoing"],
  ongoing: ["completed"],
  completed: ["closed"],
  closed: [],
};

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus,
): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!profile) return { error: "Not signed in." };
  const isStaff = ["owner", "office_staff"].includes(profile.role);
  if (!isStaff && profile.role !== "technician") return { error: "Not allowed." };
  // Closing a project is an office decision.
  if (status === "closed" && !isStaff) return { error: "Only office staff can close projects." };

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Project not found." };
  if (!FLOW[project.status]?.includes(status)) {
    return { error: `Cannot move ${PROJECT_STATUSES[project.status as ProjectStatus]} → ${PROJECT_STATUSES[status]}.` };
  }

  const patch: Record<string, unknown> = { status };
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  if (status === "ongoing") patch.start_date = today;
  if (status === "completed") patch.completed_date = today;

  const { error } = await supabase.from("projects").update(patch).eq("id", projectId);
  if (error) return { error: "Could not update the project." };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "status_changed",
    detail: { from: project.status, to: status },
  });

  // Spec §5.2: schedule preventive maintenance after completion.
  if (status === "completed") {
    const due = new Date();
    due.setMonth(due.getMonth() + 6);
    await supabase.from("maintenance_reminders").insert({
      project_id: projectId,
      due_date: due.toISOString().slice(0, 10),
      note: "6-month preventive maintenance visit",
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return {};
}

export async function assignTechnicians(
  projectId: string,
  userIds: string[],
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const supabase = await createClient();

  await supabase.from("project_assignments").delete().eq("project_id", projectId);
  if (userIds.length) {
    const { error } = await supabase
      .from("project_assignments")
      .insert(userIds.map((user_id) => ({ project_id: projectId, user_id })));
    if (error) return { error: "Could not save assignments." };
  }

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "technicians_assigned",
    detail: { count: userIds.length },
  });

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function addProjectNote(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") return { error: "Not allowed." };

  const projectId = String(formData.get("project_id") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!projectId || !note) return { error: "Write a note first." };

  const supabase = await createClient();
  const { error } = await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "note",
    detail: { text: note },
  });
  if (error) return { error: "Could not save the note." };

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function updateProjectDates(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  await requireRole("owner", "office_staff");
  const projectId = String(formData.get("project_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const targetDate = String(formData.get("target_date") ?? "");
  if (!projectId) return { error: "Invalid project." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ start_date: startDate || null, target_date: targetDate || null })
    .eq("id", projectId);
  if (error) return { error: "Could not save dates." };

  revalidatePath(`/projects/${projectId}`);
  return { saved: true };
}
