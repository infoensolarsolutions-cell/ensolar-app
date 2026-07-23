"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { makePinHash } from "@/lib/pin";

export async function saveEmployee(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireRole("owner");

  const employeeId = String(formData.get("employee_id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const position = String(formData.get("position") ?? "").trim().slice(0, 100);
  const rateType = String(formData.get("rate_type") ?? "daily");
  const rate = Math.max(0, Number(formData.get("rate") ?? 0) || 0);
  const sss = String(formData.get("sss_no") ?? "").trim().slice(0, 30);
  const philhealth = String(formData.get("philhealth_no") ?? "").trim().slice(0, 30);
  const pagibig = String(formData.get("pagibig_no") ?? "").trim().slice(0, 30);
  const hiredAt = String(formData.get("hired_at") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  const active = String(formData.get("active") ?? "true") === "true";

  if (!name) return { error: "Name is required." };
  if (!["daily", "monthly"].includes(rateType)) return { error: "Invalid rate type." };

  const pin = String(formData.get("pin") ?? "").trim();
  if (pin && !/^\d{4,6}$/.test(pin)) {
    return { error: "Kiosk PIN must be 4–6 digits (numbers only)." };
  }

  const text = (k: string, max = 200) =>
    String(formData.get(k) ?? "").trim().slice(0, max) || null;
  const birthDate = String(formData.get("birth_date") ?? "");

  const supabase = await createClient();
  const row: Record<string, unknown> = {
    name,
    position: position || null,
    rate_type: rateType,
    rate,
    sss_no: sss || null,
    philhealth_no: philhealth || null,
    pagibig_no: pagibig || null,
    hired_at: hiredAt || null,
    profile_id: profileId || null,
    active,
    address: text("address", 300),
    birth_date: birthDate || null,
    gender: text("gender", 30),
    contact_no: text("contact_no", 40),
    email: text("email", 200),
    emergency_name: text("emergency_name"),
    emergency_relationship: text("emergency_relationship", 60),
    emergency_contact_no: text("emergency_contact_no", 40),
    emergency_address: text("emergency_address", 300),
  };
  // Blank PIN leaves the existing one unchanged.
  if (pin) row.pin_hash = makePinHash(pin);

  if (employeeId) {
    const { error } = await supabase.from("employees").update(row).eq("id", employeeId);
    if (error) {
      console.error("saveEmployee update:", error);
      return { error: `Could not save: ${error.message}` };
    }
    revalidatePath(`/employees/${employeeId}`);
    revalidatePath("/employees");
    return {};
  }

  const { data: created, error } = await supabase
    .from("employees")
    .insert(row)
    .select("id")
    .single();
  if (error || !created) {
    console.error("saveEmployee insert:", error);
    return { error: `Could not create: ${error?.message ?? "unknown"}` };
  }
  revalidatePath("/employees");
  redirect(`/employees/${created.id}`);
}
