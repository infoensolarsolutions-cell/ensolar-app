"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KB_CATEGORIES } from "@/lib/kb";

function readFields(formData: FormData) {
  return {
    category: String(formData.get("category") ?? ""),
    brand: String(formData.get("brand") ?? "").trim().slice(0, 100) || null,
    model: String(formData.get("model") ?? "").trim().slice(0, 100) || null,
    problem: String(formData.get("problem") ?? "").trim().slice(0, 2000),
    solution: String(formData.get("solution") ?? "").trim().slice(0, 4000),
    source: String(formData.get("source") ?? "").trim().slice(0, 200) || null,
  };
}

export async function addKbIssue(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const fields = readFields(formData);
  if (!(fields.category in KB_CATEGORIES)) return { error: "Choose a category." };
  if (!fields.problem) return { error: "Describe the problem." };
  if (!fields.solution) return { error: "Describe the solution." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("kb_issues")
    .insert({ ...fields, created_by: profile.id });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/knowledge");
  return { saved: true };
}

export async function updateKbIssue(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  await requireRole("owner", "office_staff");
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (!id) return { error: "Missing entry reference." };
  if (!(fields.category in KB_CATEGORIES)) return { error: "Choose a category." };
  if (!fields.problem) return { error: "Describe the problem." };
  if (!fields.solution) return { error: "Describe the solution." };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("kb_issues")
    .update(fields)
    .eq("id", id)
    .select("id");
  if (error) return { error: `Could not save: ${error.message}` };
  if (!updated?.length) return { error: "Entry not found." };

  revalidatePath("/knowledge");
  return { saved: true };
}

export async function deleteKbIssue(id: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { error } = await supabase.from("kb_issues").delete().eq("id", id);
  if (error) return { error: `Could not delete: ${error.message}` };
  revalidatePath("/knowledge");
  return {};
}
