"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveProduct(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");

  const productId = String(formData.get("product_id") ?? "");
  const sku = String(formData.get("sku") ?? "").trim().slice(0, 60);
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const category = String(formData.get("category") ?? "").trim().slice(0, 100);
  const unit = String(formData.get("unit") ?? "pc").trim().slice(0, 20) || "pc";
  const costPrice = Math.max(0, Number(formData.get("cost_price") ?? 0) || 0);
  const sellingPrice = Math.max(0, Number(formData.get("selling_price") ?? 0) || 0);
  const reorderLevel = Math.max(0, Number(formData.get("reorder_level") ?? 0) || 0);
  const active = String(formData.get("active") ?? "true") === "true";

  if (!sku || !name) return { error: "SKU and name are required." };

  const supabase = await createClient();
  const row = {
    sku,
    name,
    category: category || null,
    unit,
    cost_price: costPrice,
    selling_price: sellingPrice,
    reorder_level: reorderLevel,
    active,
  };

  if (productId) {
    const { error } = await supabase.from("products").update(row).eq("id", productId);
    if (error) return { error: "Could not save. Is the SKU already used?" };
    revalidatePath(`/products/${productId}`);
    revalidatePath("/products");
    return {};
  }

  const { data: created, error } = await supabase
    .from("products")
    .insert(row)
    .select("id")
    .single();
  if (error || !created) return { error: "Could not create. Is the SKU already used?" };
  revalidatePath("/products");
  redirect(`/products/${created.id}`);
}

export async function stockIn(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const productId = String(formData.get("product_id") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  const unitCost = Math.max(0, Number(formData.get("unit_cost") ?? 0) || 0);
  const supplier = String(formData.get("supplier") ?? "").trim().slice(0, 200);
  const referenceNo = String(formData.get("reference_no") ?? "").trim().slice(0, 100);
  const date = String(formData.get("date") ?? "");

  if (!productId || !(qty > 0)) return { error: "Enter the quantity received." };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_txns").insert({
    product_id: productId,
    type: "in",
    qty,
    unit_cost: unitCost,
    supplier: supplier || null,
    reference_no: referenceNo || null,
    ...(date ? { date } : {}),
    user_id: profile.id,
  });
  if (error) return { error: "Could not record the delivery." };

  // Keep latest purchase cost as the product's cost price.
  if (unitCost > 0) {
    await supabase.from("products").update({ cost_price: unitCost }).eq("id", productId);
  }

  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  return {};
}

export async function adjustStock(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const productId = String(formData.get("product_id") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);

  if (!productId || !qty) return { error: "Enter the adjustment quantity (+ or −)." };
  if (!reason) return { error: "A reason is required for adjustments." };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_txns").insert({
    product_id: productId,
    type: "adjustment",
    qty,
    reason,
    user_id: profile.id,
  });
  if (error) return { error: "Could not record the adjustment." };

  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  return {};
}
