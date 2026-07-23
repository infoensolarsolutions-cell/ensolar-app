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

export async function correctClockOut(
  attendanceId: string,
  time: string,
  reason: string,
): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!profile || !["owner", "office_staff"].includes(profile.role)) {
    return { error: "Only office staff can correct clock-outs." };
  }
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Pick the actual clock-out time." };

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("attendance")
    .select("id, clock_in, clock_out")
    .eq("id", attendanceId)
    .single();
  if (!entry) return { error: "Attendance entry not found." };

  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(entry.clock_in));
  const newIso = new Date(`${day}T${time}:00+08:00`).toISOString();
  if (newIso <= entry.clock_in) {
    return { error: "Clock-out must be after the clock-in time." };
  }

  const { error } = await supabase
    .from("attendance")
    .update({ clock_out: newIso, auto_clocked_out: false })
    .eq("id", attendanceId);
  if (error) return { error: `Could not save: ${error.message}` };

  await supabase.from("attendance_edits").insert({
    attendance_id: attendanceId,
    edited_by: profile.id,
    before: { clock_out: entry.clock_out },
    after: { clock_out: newIso },
    reason: reason.trim() || "Clock-out corrected by office staff",
  });

  revalidatePath("/attendance");
  return {};
}
