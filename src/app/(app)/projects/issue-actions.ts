"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Issue store-room materials to a project: stock goes down, the project's
// material cost goes up at cost price (Spec §5.3 → §5.2 profitability).
export async function issueToProject(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const projectId = String(formData.get("project_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  const qty = Number(formData.get("qty") ?? 0);

  if (!projectId || !productId) return { error: "Choose a product." };
  if (!(qty > 0)) return { error: "Enter the quantity to issue." };

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products_with_stock")
    .select("id, name, sku, unit, cost_price, on_hand")
    .eq("id", productId)
    .single();
  if (!product) return { error: "Product not found." };
  if (Number(product.on_hand) < qty) {
    return { error: `Only ${product.on_hand} ${product.unit} in stock.` };
  }

  const { data: txn, error: txnError } = await supabase
    .from("inventory_txns")
    .insert({
      product_id: productId,
      type: "project_issue",
      qty: -qty,
      unit_cost: product.cost_price,
      ref_table: "projects",
      ref_id: projectId,
      user_id: profile.id,
    })
    .select("id")
    .single();
  if (txnError || !txn) return { error: "Could not issue the stock." };

  const amount = Math.round(qty * Number(product.cost_price) * 100) / 100;
  const { error: costError } = await supabase.from("project_costs").insert({
    project_id: projectId,
    type: "materials",
    description: `${product.name} (${product.sku}) × ${qty} ${product.unit}`,
    amount,
    inventory_txn_id: txn.id,
    created_by: profile.id,
  });
  if (costError) return { error: "Stock issued but cost recording failed — tell the owner." };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "materials_issued",
    detail: { product: product.sku, qty, amount },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/products");
  return {};
}
