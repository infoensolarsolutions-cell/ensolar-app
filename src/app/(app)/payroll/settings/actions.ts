"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const KEYS = ["sss", "philhealth", "pagibig", "tax"] as const;

export async function saveContribution(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner");
  const key = String(formData.get("key") ?? "");
  if (!KEYS.includes(key as (typeof KEYS)[number])) return { error: "Unknown setting." };

  let config: Record<string, unknown>;
  if (key === "tax") {
    try {
      const brackets = JSON.parse(String(formData.get("brackets") ?? "[]")) as {
        over: number; base: number; percent: number;
      }[];
      const clean = brackets
        .map((b) => ({
          over: Number(b.over) || 0,
          base: Number(b.base) || 0,
          percent: Number(b.percent) || 0,
        }))
        .filter((b) => b.percent >= 0 && b.percent <= 100)
        .sort((a, b) => a.over - b.over);
      if (!clean.length) return { error: "At least one bracket is required." };
      config = { brackets: clean };
    } catch {
      return { error: "Invalid brackets." };
    }
  } else {
    config = {};
    for (const [k, v] of formData.entries()) {
      if (k === "key") continue;
      const n = Number(v);
      if (isNaN(n) || n < 0) return { error: `Invalid value for ${k}.` };
      config[k] = n;
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contribution_settings")
    .update({ config, updated_at: new Date().toISOString(), updated_by: profile.id })
    .eq("key", key);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/payroll/settings");
  return { saved: true };
}

export async function addCashAdvance(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner");
  const employeeId = String(formData.get("employee_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const date = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);

  if (!employeeId || !(amount > 0)) return { error: "Enter the advance amount." };

  const supabase = await createClient();
  const { error } = await supabase.from("cash_advances").insert({
    employee_id: employeeId,
    amount,
    ...(date ? { date } : {}),
    note: note || null,
    created_by: profile.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath(`/employees/${employeeId}`);
  return {};
}

export async function deleteCashAdvance(
  advanceId: string,
  employeeId: string,
): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { data: advance } = await supabase
    .from("cash_advances")
    .select("repaid")
    .eq("id", advanceId)
    .single();
  if (!advance) return { error: "Advance not found." };
  if (Number(advance.repaid) > 0) {
    return { error: "This advance already has repayments and cannot be deleted." };
  }
  const { error } = await supabase.from("cash_advances").delete().eq("id", advanceId);
  if (error) return { error: `Could not delete: ${error.message}` };
  revalidatePath(`/employees/${employeeId}`);
  return {};
}
