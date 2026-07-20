"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { manilaInputToIso } from "@/lib/format";

export async function correctAttendance(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner");
  const attendanceId = String(formData.get("attendance_id") ?? "");
  const employeeId = String(formData.get("employee_id") ?? "");
  const clockIn = manilaInputToIso(String(formData.get("clock_in") ?? ""));
  const clockOut = manilaInputToIso(String(formData.get("clock_out") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);

  if (!attendanceId || !clockIn) return { error: "Clock-in time is required." };
  if (!reason) return { error: "A reason is required for corrections." };
  if (clockOut && clockOut <= clockIn) return { error: "Clock-out must be after clock-in." };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("attendance")
    .select("clock_in, clock_out")
    .eq("id", attendanceId)
    .single();
  if (!before) return { error: "Entry not found." };

  const { error } = await supabase
    .from("attendance")
    .update({ clock_in: clockIn, clock_out: clockOut, source: "admin" })
    .eq("id", attendanceId);
  if (error) return { error: `Could not save: ${error.message}` };

  await supabase.from("attendance_edits").insert({
    attendance_id: attendanceId,
    edited_by: profile.id,
    before,
    after: { clock_in: clockIn, clock_out: clockOut },
    reason,
  });

  revalidatePath(`/employees/${employeeId}`);
  return {};
}

export async function addManualAttendance(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner");
  const employeeId = String(formData.get("employee_id") ?? "");
  const clockIn = manilaInputToIso(String(formData.get("clock_in") ?? ""));
  const clockOut = manilaInputToIso(String(formData.get("clock_out") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);

  if (!employeeId || !clockIn) return { error: "Clock-in time is required." };
  if (!reason) return { error: "A reason is required for manual entries." };
  if (clockOut && clockOut <= clockIn) return { error: "Clock-out must be after clock-in." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("attendance")
    .insert({
      employee_id: employeeId,
      clock_in: clockIn,
      clock_out: clockOut,
      source: "admin",
    })
    .select("id")
    .single();
  if (error || !created) return { error: `Could not save: ${error?.message ?? "unknown"}` };

  await supabase.from("attendance_edits").insert({
    attendance_id: created.id,
    edited_by: profile.id,
    before: {},
    after: { clock_in: clockIn, clock_out: clockOut },
    reason: `Manual entry: ${reason}`,
  });

  revalidatePath(`/employees/${employeeId}`);
  return {};
}

export async function addLeave(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner");
  const employeeId = String(formData.get("employee_id") ?? "");
  const dateFrom = String(formData.get("date_from") ?? "");
  const dateTo = String(formData.get("date_to") ?? "") || dateFrom;
  const type = String(formData.get("type") ?? "");
  const paid = String(formData.get("paid") ?? "false") === "true";
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);

  if (!employeeId || !dateFrom) return { error: "Start date is required." };
  if (!["vacation", "sick", "absence", "other"].includes(type)) {
    return { error: "Choose a leave type." };
  }
  if (dateTo < dateFrom) return { error: "End date is before start date." };

  const supabase = await createClient();
  const { error } = await supabase.from("leaves").insert({
    employee_id: employeeId,
    date_from: dateFrom,
    date_to: dateTo,
    type,
    paid,
    note: note || null,
    created_by: profile.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath(`/employees/${employeeId}`);
  return {};
}

export async function deleteLeave(
  leaveId: string,
  employeeId: string,
): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { error } = await supabase.from("leaves").delete().eq("id", leaveId);
  if (error) return { error: `Could not delete: ${error.message}` };
  revalidatePath(`/employees/${employeeId}`);
  return {};
}
