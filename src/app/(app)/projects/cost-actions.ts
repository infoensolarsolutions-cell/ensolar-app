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

export async function updateCost(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const costId = String(formData.get("cost_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const type = String(formData.get("type") ?? "");
  const description = String(formData.get("description") ?? "").trim().slice(0, 300);
  const amount = Number(formData.get("amount") ?? 0);
  const date = String(formData.get("date") ?? "");

  if (!costId || !projectId) return { error: "Missing cost reference." };
  if (!(type in COST_TYPES)) return { error: "Choose a cost type." };
  if (!(amount > 0)) return { error: "Enter the cost amount." };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("project_costs")
    .select("inventory_txn_id, amount")
    .eq("id", costId)
    .single();
  if (!before) return { error: "Cost not found." };
  if (before.inventory_txn_id) {
    return { error: "Inventory-issued costs cannot be edited — return them to stock instead." };
  }

  const { error } = await supabase
    .from("project_costs")
    .update({
      type,
      description: description || null,
      amount,
      ...(date ? { date } : {}),
    })
    .eq("id", costId);
  if (error) return { error: `Could not save: ${error.message}` };

  if (Number(before.amount) !== amount) {
    await supabase.from("project_events").insert({
      project_id: projectId,
      user_id: profile.id,
      event: "note",
      detail: {
        text: `Cost edited: ${COST_TYPES[type as keyof typeof COST_TYPES]} ${Number(before.amount).toLocaleString()} → ${amount.toLocaleString()}`,
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);
  return { saved: true };
}

// Undo an inventory issue: put the quantity back on the shelf and drop the
// project cost, keeping the original transaction for the audit trail.
export async function returnInventoryCost(
  costId: string,
  projectId: string,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: cost } = await supabase
    .from("project_costs")
    .select("amount, inventory_txn_id")
    .eq("id", costId)
    .single();
  if (!cost) return { error: "Cost not found." };
  if (!cost.inventory_txn_id) return { error: "This cost is not from inventory." };

  const { data: txn } = await supabase
    .from("inventory_txns")
    .select("product_id, qty, products (name, sku)")
    .eq("id", cost.inventory_txn_id)
    .single();
  if (!txn) return { error: "Original inventory record not found." };

  const returnQty = -Number(txn.qty);
  if (!(returnQty > 0)) return { error: "Nothing to return for this cost." };

  const product = Array.isArray(txn.products) ? txn.products[0] : txn.products;
  const { error: adjError } = await supabase.from("inventory_txns").insert({
    product_id: txn.product_id,
    type: "adjustment",
    qty: returnQty,
    reason: "Returned to stock from project",
    ref_table: "project_costs",
    ref_id: costId,
    user_id: profile.id,
  });
  if (adjError) return { error: `Could not return stock: ${adjError.message}` };

  const { error } = await supabase.from("project_costs").delete().eq("id", costId);
  if (error) return { error: `Stock returned, but the cost could not be removed: ${error.message}` };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "note",
    detail: {
      text: `Materials returned to stock: ${returnQty} × ${product?.name ?? "item"} (${formatAmount(cost.amount)})`,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/products");
  return {};
}

function formatAmount(v: number): string {
  return `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}
