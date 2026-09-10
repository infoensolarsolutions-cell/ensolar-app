"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveBranch(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  await requireRole("owner");
  const branchId = String(formData.get("branch_id") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase().slice(0, 8);
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const address = String(formData.get("address") ?? "").trim().slice(0, 300) || null;
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40) || null;
  const active = String(formData.get("active") ?? "true") === "true";

  if (!/^[A-Z0-9]{2,8}$/.test(code)) {
    return { error: "Branch code: 2–8 letters/numbers (e.g. BAIS, SIA)." };
  }
  if (!name) return { error: "Branch name is required." };

  const supabase = await createClient();
  const row = { code, name, address, phone, active };
  const { error } = branchId
    ? await supabase.from("branches").update(row).eq("id", branchId)
    : await supabase.from("branches").insert(row);
  if (error) {
    return {
      error: error.message.includes("duplicate")
        ? `Branch code ${code} is already used.`
        : `Could not save: ${error.message}`,
    };
  }

  revalidatePath("/settings/branches");
  revalidatePath("/", "layout");
  return { saved: true };
}
