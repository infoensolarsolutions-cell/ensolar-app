"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function clockIn(
  lat?: number,
  lng?: number,
): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") return { error: "Not allowed." };

  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, active")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!employee) {
    return { error: "No employee record is linked to your account. Ask the owner to link it." };
  }
  if (!employee.active) return { error: "Your employee record is inactive." };

  const { data: open } = await supabase
    .from("attendance")
    .select("id")
    .eq("employee_id", employee.id)
    .is("clock_out", null)
    .maybeSingle();
  if (open) return { error: "You are already clocked in." };

  const { error } = await supabase.from("attendance").insert({
    employee_id: employee.id,
    lat: lat ?? null,
    lng: lng ?? null,
  });
  if (error) return { error: `Could not clock in: ${error.message}` };

  revalidatePath("/attendance");
  return {};
}

export async function clockOut(): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") return { error: "Not allowed." };

  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!employee) return { error: "No employee record linked to your account." };

  const { data: open } = await supabase
    .from("attendance")
    .select("id")
    .eq("employee_id", employee.id)
    .is("clock_out", null)
    .maybeSingle();
  if (!open) return { error: "You are not clocked in." };

  const { error } = await supabase
    .from("attendance")
    .update({ clock_out: new Date().toISOString() })
    .eq("id", open.id);
  if (error) return { error: `Could not clock out: ${error.message}` };

  revalidatePath("/attendance");
  return {};
}
