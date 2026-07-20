"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const row = {
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
  };

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
