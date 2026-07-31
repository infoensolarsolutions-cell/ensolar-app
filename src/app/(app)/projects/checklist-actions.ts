"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CHECKLIST_TEMPLATES, newChecklistItems, type ChecklistItem } from "@/lib/checklists";

export async function addProjectChecklist(
  projectId: string,
  templateKey: string,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff", "technician");
  const template = CHECKLIST_TEMPLATES.find((t) => t.key === templateKey);
  const items = newChecklistItems(templateKey);
  if (!template || !items) return { error: "Unknown checklist." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("project_checklists")
    .insert({
      project_id: projectId,
      template_key: templateKey,
      title: template.title,
      items,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { error: `Could not add: ${error.message}` };
  if (!created) return { error: "Blocked — you must be assigned to this project." };

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function toggleChecklistItem(
  checklistId: string,
  itemKey: string,
  done: boolean,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff", "technician");
  const supabase = await createClient();

  // RLS scopes this read: staff see all, technicians only assigned projects.
  const { data: checklist } = await supabase
    .from("project_checklists")
    .select("id, project_id, items")
    .eq("id", checklistId)
    .single();
  if (!checklist) return { error: "Checklist not found." };

  const who = profile.name || profile.email || "Unknown";
  const items = (checklist.items as ChecklistItem[]).map((i) =>
    i.key === itemKey
      ? {
          ...i,
          done,
          by: done ? who : null,
          at: done ? new Date().toISOString() : null,
        }
      : i,
  );
  const allDone = items.every((i) => i.done);

  const { data: updated, error } = await supabase
    .from("project_checklists")
    .update({ items, completed_at: allDone ? new Date().toISOString() : null })
    .eq("id", checklistId)
    .select("id");
  if (error) return { error: `Could not save: ${error.message}` };
  if (!updated?.length) return { error: "Blocked — you must be assigned to this project." };

  revalidatePath(`/projects/${checklist.project_id}`);
  revalidatePath(`/projects/${checklist.project_id}/checklist/${checklistId}`);
  return {};
}

export async function saveChecklistRemarks(
  checklistId: string,
  remarks: string,
): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff", "technician");
  const supabase = await createClient();
  const { data: checklist } = await supabase
    .from("project_checklists")
    .select("id, project_id")
    .eq("id", checklistId)
    .single();
  if (!checklist) return { error: "Checklist not found." };

  const { data: updated, error } = await supabase
    .from("project_checklists")
    .update({ remarks: remarks.trim().slice(0, 2000) || null })
    .eq("id", checklistId)
    .select("id");
  if (error) return { error: `Could not save: ${error.message}` };
  if (!updated?.length) return { error: "Blocked — you must be assigned to this project." };

  revalidatePath(`/projects/${checklist.project_id}/checklist/${checklistId}`);
  return {};
}

export async function deleteProjectChecklist(
  checklistId: string,
): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { data: checklist } = await supabase
    .from("project_checklists")
    .select("id, project_id")
    .eq("id", checklistId)
    .single();
  if (!checklist) return { error: "Checklist not found." };
  const { error } = await supabase
    .from("project_checklists")
    .delete()
    .eq("id", checklistId);
  if (error) return { error: `Could not delete: ${error.message}` };
  revalidatePath(`/projects/${checklist.project_id}`);
  return {};
}

