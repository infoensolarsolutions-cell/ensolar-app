"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPin } from "@/lib/pin";
import { TIMEZONE } from "@/lib/format";

function timeNow(): string {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIMEZONE,
  }).format(new Date());
}

export type KioskResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  name?: string;
};

export async function kioskClock(
  _prev: KioskResult | null,
  formData: FormData,
): Promise<KioskResult> {
  // The kiosk terminal must be signed in with a staff account.
  await requireRole("owner", "office_staff");

  const pin = String(formData.get("pin") ?? "").trim();
  if (!/^\d{4,6}$/.test(pin)) return { error: "Enter your 4–6 digit PIN." };

  const admin = createAdminClient();
  const { data: employees, error: empError } = await admin
    .from("employees")
    .select("id, name, pin_hash")
    .eq("active", true)
    .not("pin_hash", "is", null);
  if (empError) return { error: `Could not check PIN: ${empError.message}` };

  const employee = (employees ?? []).find((e) => verifyPin(pin, e.pin_hash));
  if (!employee) {
    return { error: "PIN not recognized. Ask the owner to set your PIN in your employee record." };
  }

  const { data: open } = await admin
    .from("attendance")
    .select("id, clock_in")
    .eq("employee_id", employee.id)
    .is("clock_out", null)
    .order("clock_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) {
    const ageMin = (Date.now() - new Date(open.clock_in).getTime()) / 60000;
    if (ageMin < 2) {
      return {
        ok: true,
        name: employee.name,
        message: `You already clocked IN a moment ago (${timeNow()}). No changes made.`,
      };
    }
    const { error } = await admin
      .from("attendance")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", open.id);
    if (error) return { error: `Could not clock out: ${error.message}` };
    return { ok: true, name: employee.name, message: `Clocked OUT at ${timeNow()}. Good work today! 👋` };
  }

  const { error } = await admin.from("attendance").insert({
    employee_id: employee.id,
    clock_in: new Date().toISOString(),
    source: "kiosk",
  });
  if (error) return { error: `Could not clock in: ${error.message}` };
  return { ok: true, name: employee.name, message: `Clocked IN at ${timeNow()}. Have a great day! ☀️` };
}
