"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function meetingFields(formData: FormData) {
  const text = (k: string, max: number) =>
    String(formData.get(k) ?? "").trim().slice(0, max) || null;
  return {
    title: String(formData.get("title") ?? "").trim().slice(0, 200),
    date: String(formData.get("date") ?? ""),
    time: String(formData.get("time") ?? "").trim(),
    attendees: text("attendees", 300),
    location: text("location", 300),
    purpose: text("purpose", 500),
    method: text("method", 100),
  };
}

export async function addAppointment(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const f = meetingFields(formData);

  if (!f.title) return { error: "What is the meeting about?" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return { error: "Pick a date." };
  if (f.time && !/^\d{2}:\d{2}$/.test(f.time)) return { error: "Invalid time." };

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").insert({
    title: f.title,
    date: f.date,
    time: f.time || null,
    attendees: f.attendees,
    location: f.location,
    purpose: f.purpose,
    method: f.method,
    created_by: profile.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/");
  return { saved: true };
}

export async function updateAppointment(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  await requireRole("owner", "office_staff");
  const id = String(formData.get("appointment_id") ?? "");
  const f = meetingFields(formData);

  if (!id) return { error: "Missing meeting reference." };
  if (!f.title) return { error: "What is the meeting about?" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return { error: "Pick a date." };
  if (f.time && !/^\d{2}:\d{2}$/.test(f.time)) return { error: "Invalid time." };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("appointments")
    .update({
      title: f.title,
      date: f.date,
      time: f.time || null,
      attendees: f.attendees,
      location: f.location,
      purpose: f.purpose,
      method: f.method,
    })
    .eq("id", id)
    .select("id");
  if (error) return { error: `Could not save: ${error.message}` };
  if (!updated?.length) return { error: "Meeting not found." };

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
