"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addAppointment(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "").trim();

  if (!title) return { error: "What is the meeting about?" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a date." };
  if (time && !/^\d{2}:\d{2}$/.test(time)) return { error: "Invalid time." };

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").insert({
    title,
    date,
    time: time || null,
    created_by: profile.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/");
  return { saved: true };
}

export async function deleteAppointment(id: string): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return { error: `Could not remove: ${error.message}` };
  revalidatePath("/");
  return {};
}
