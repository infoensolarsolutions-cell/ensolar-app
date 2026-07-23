"use server";

import { revalidatePath } from "next/cache";
import { getProfile, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATUSES, SERVICE_TYPES, type ProjectStatus } from "@/lib/crm";

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
  // Status changes are an office decision — technicians report, staff decide.
  const profile = await requireRole("owner", "office_staff");

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

// Undo an accidental status change, one step back (Spec keeps forward moves
// for technicians; going backward is an office decision).
const BACK: Partial<Record<ProjectStatus, ProjectStatus>> = {
  ongoing: "pending",
  completed: "ongoing",
  closed: "completed",
};

export async function revertProjectStatus(
  projectId: string,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Project not found." };

  const to = BACK[project.status as ProjectStatus];
  if (!to) return { error: "This project has no previous status." };

  const patch: Record<string, unknown> = { status: to };
  if (project.status === "completed") patch.completed_date = null;
  if (project.status === "ongoing") patch.start_date = null;

  const { error } = await supabase.from("projects").update(patch).eq("id", projectId);
  if (error) return { error: `Could not update: ${error.message}` };

  // Un-completing removes the auto-scheduled maintenance visit (if untouched).
  if (project.status === "completed") {
    await supabase
      .from("maintenance_reminders")
      .delete()
      .eq("project_id", projectId)
      .eq("status", "pending")
      .eq("note", "6-month preventive maintenance visit");
  }

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "status_changed",
    detail: { from: project.status, to },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return {};
}

// Permanently remove a wrongly created project (e.g. superseded by a new
// unified quotation). Payments, service tickets, and contracts are permanent
// records, so a project that has any of them cannot be deleted.
export async function deleteProject(
  projectId: string,
): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();

  const [{ count: payments }, { count: tickets }, { count: contracts }] =
    await Promise.all([
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("project_id", projectId),
      supabase.from("service_tickets").select("id", { count: "exact", head: true }).eq("project_id", projectId),
      supabase.from("contracts").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    ]);
  const blockers = [
    payments ? `${payments} payment(s)` : null,
    tickets ? `${tickets} service ticket(s)` : null,
    contracts ? `${contracts} contract(s)` : null,
  ].filter(Boolean);
  if (blockers.length) {
    return {
      error: `Cannot delete — this project has ${blockers.join(", ")} on record. Payments, tickets, and contracts are permanent records, so this project must stay.`,
    };
  }

  // Photo files don't cascade with the DB rows — clear them from storage first.
  const { data: photos } = await supabase
    .from("project_photos")
    .select("storage_path")
    .eq("project_id", projectId);
  if (photos?.length) {
    await supabase.storage
      .from("project-photos")
      .remove(photos.map((p) => p.storage_path));
  }

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { error: `Could not delete: ${error.message}` };

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

export async function updateSiteAddress(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const projectId = String(formData.get("project_id") ?? "");
  const siteAddress = String(formData.get("site_address") ?? "").trim() || null;
  if (!projectId) return { error: "Missing project reference." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ site_address: siteAddress })
    .eq("id", projectId);
  if (error) return { error: `Could not save: ${error.message}` };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "site_address_updated",
  });

  revalidatePath(`/projects/${projectId}`);
  return { saved: true };
}

export async function updateProjectData(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner");
  const projectId = String(formData.get("project_id") ?? "");
  const serviceType = String(formData.get("service_type") ?? "");
  const contractAmount = Number(formData.get("contract_amount") ?? 0);

  if (!projectId) return { error: "Missing project reference." };
  if (serviceType && !(serviceType in SERVICE_TYPES)) {
    return { error: "Invalid service type." };
  }
  if (!Number.isFinite(contractAmount) || contractAmount < 0) {
    return { error: "Contract amount must be zero or more." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("projects")
    .select("contract_amount, service_type")
    .eq("id", projectId)
    .single();
  if (!before) return { error: "Project not found." };

  const { error } = await supabase
    .from("projects")
    .update({
      service_type: serviceType || null,
      contract_amount: contractAmount,
    })
    .eq("id", projectId);
  if (error) return { error: `Could not save: ${error.message}` };

  if (Number(before.contract_amount) !== contractAmount) {
    await supabase.from("project_events").insert({
      project_id: projectId,
      user_id: profile.id,
      event: "note",
      detail: {
        text: `Contract amount changed from ${Number(before.contract_amount).toLocaleString()} to ${contractAmount.toLocaleString()}`,
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { saved: true };
}
