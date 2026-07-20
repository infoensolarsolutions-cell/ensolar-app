"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { COST_TYPES } from "@/lib/crm";

export async function addCost(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const projectId = String(formData.get("project_id") ?? "");
  const type = String(formData.get("type") ?? "");
  const description = String(formData.get("description") ?? "").trim().slice(0, 300);
  const amount = Number(formData.get("amount") ?? 0);
  const date = String(formData.get("date") ?? "");

  if (!projectId || !(type in COST_TYPES)) return { error: "Choose a cost type." };
  if (!(amount > 0)) return { error: "Enter the cost amount." };

  const supabase = await createClient();
  const { error } = await supabase.from("project_costs").insert({
    project_id: projectId,
    type,
    description: description || null,
    amount,
    ...(date ? { date } : {}),
    created_by: profile.id,
  });
  if (error) return { error: "Could not save the cost." };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "cost_added",
    detail: { type, amount },
  });

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function deleteCost(
  costId: string,
  projectId: string,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: cost } = await supabase
    .from("project_costs")
    .select("type, amount, inventory_txn_id")
    .eq("id", costId)
    .single();
  if (!cost) return { error: "Cost not found." };
  if (cost.inventory_txn_id) {
    return { error: "This cost came from an inventory issue and cannot be deleted here." };
  }

  const { error } = await supabase.from("project_costs").delete().eq("id", costId);
  if (error) return { error: "Could not delete the cost." };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "cost_deleted",
    detail: { type: cost.type, amount: cost.amount },
  });

  revalidatePath(`/projects/${projectId}`);
  return {};
}
