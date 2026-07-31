"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CHECKLIST_TEMPLATES,
  newChecklistItems,
  normalizeItems,
  type ChecklistItem,
  type Equipment,
  type ItemStatus,
} from "@/lib/checklists";

export async function addProjectChecklist(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff", "technician");
  const projectId = String(formData.get("project_id") ?? "");
  const templateKey = String(formData.get("template_key") ?? "");
  const template = CHECKLIST_TEMPLATES.find((t) => t.key === templateKey);
  if (!projectId || !template) return { error: "Unknown checklist." };

  const brand = String(formData.get("brand") ?? "").trim().slice(0, 60);
  const model = String(formData.get("model") ?? "").trim().slice(0, 80);
  const kw = Number(formData.get("kw") ?? 0);
  const voltage = Number(formData.get("voltage") ?? 0);
  const phases = Number(formData.get("phases") ?? 0);

  if (!brand || !model) return { error: "Enter the inverter brand and model." };
  if (!(kw > 0)) return { error: "Enter the kW rating." };
  if (!(voltage > 0)) return { error: "Enter the voltage rating." };
  if (phases !== 1 && phases !== 3) return { error: "Pick single-phase or three-phase." };

  const equipment: Equipment = { brand, model, kw, voltage, phases };
  const items = newChecklistItems(templateKey, equipment);
  if (!items) return { error: "Unknown checklist." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("project_checklists")
    .insert({
      project_id: projectId,
      template_key: templateKey,
      title: `${template.title} — ${brand} ${model} ${kw} kW`,
      items,
      equipment,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { error: `Could not add: ${error.message}` };
  if (!created) return { error: "Blocked — you must be assigned to this project." };

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function setChecklistItemStatus(
  checklistId: string,
  itemKey: string,
  status: ItemStatus,
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
  const items = normalizeItems(checklist.items as ChecklistItem[]).map((i) =>
    i.key === itemKey
      ? {
          ...i,
          status,
          done: status === "pass",
          by: status ? who : null,
          at: status ? new Date().toISOString() : null,
        }
      : i,
  );
  const allMarked = items.every((i) => i.status !== null);
  const noFails = items.every((i) => i.status !== "fail");

  const { data: updated, error } = await supabase
    .from("project_checklists")
    .update({
      items,
      completed_at: allMarked && noFails ? new Date().toISOString() : null,
    })
    .eq("id", checklistId)
    .select("id");
  if (error) return { error: `Could not save: ${error.message}` };
  if (!updated?.length) return { error: "Blocked — you must be assigned to this project." };

  revalidatePath(`/projects/${checklist.project_id}`);
  revalidatePath(`/projects/${checklist.project_id}/checklist/${checklistId}`);
  return {};
}

export async function setChecklistItemComment(
  checklistId: string,
  itemKey: string,
  comment: string,
): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff", "technician");
  const supabase = await createClient();

  const { data: checklist } = await supabase
    .from("project_checklists")
    .select("id, project_id, items")
    .eq("id", checklistId)
    .single();
  if (!checklist) return { error: "Checklist not found." };

  const items = normalizeItems(checklist.items as ChecklistItem[]).map((i) =>
    i.key === itemKey
      ? { ...i, comment: comment.trim().slice(0, 500) || null }
      : i,
  );

  const { data: updated, error } = await supabase
    .from("project_checklists")
    .update({ items })
    .eq("id", checklistId)
    .select("id");
  if (error) return { error: `Could not save: ${error.message}` };
  if (!updated?.length) return { error: "Blocked — you must be assigned to this project." };

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
