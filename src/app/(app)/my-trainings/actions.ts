"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const TYPES = ["training", "seminar", "certification", "workshop", "other"];

// Members record trainings/seminars on their own 201 file. RLS only lets a
// person insert rows for their own employee record and delete rows they
// added themselves — owner-added records stay owner-managed.

export async function addMyTraining(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff", "technician");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const provider = String(formData.get("provider") ?? "").trim().slice(0, 200);
  const type = String(formData.get("type") ?? "training");
  const dateFrom = String(formData.get("date_from") ?? "");
  const dateTo = String(formData.get("date_to") ?? "") || null;
  const venue = String(formData.get("venue") ?? "").trim().slice(0, 200);
  const certificate = String(formData.get("certificate") ?? "") === "yes";
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);

  if (!title) return { error: "Title is required." };
  if (!dateFrom) return { error: "Start date is required." };
  if (!TYPES.includes(type)) return { error: "Choose an activity type." };
  if (dateTo && dateTo < dateFrom) return { error: "End date is before start date." };

  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!employee) {
    return {
      error:
        "Your account is not linked to an employee record yet — ask the owner to link it under Employees.",
    };
  }

  const { error } = await supabase.from("employee_trainings").insert({
    employee_id: employee.id,
    title,
    provider: provider || null,
    type,
    date_from: dateFrom,
    date_to: dateTo,
    venue: venue || null,
    certificate,
    notes: notes || null,
    created_by: profile.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/my-trainings");
  revalidatePath("/employees/development");
  return { saved: true };
}

export async function deleteMyTraining(trainingId: string): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff", "technician");
  const supabase = await createClient();
  // RLS: only rows on my own record that I added myself can be deleted here.
  const { data: deleted, error } = await supabase
    .from("employee_trainings")
    .delete()
    .eq("id", trainingId)
    .select("id");
  if (error) return { error: `Could not delete: ${error.message}` };
  if (!deleted?.length) {
    return { error: "This record was added by the office — ask the owner to correct it." };
  }
  revalidatePath("/my-trainings");
  return {};
}
