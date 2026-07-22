"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Show the real database error so failures are diagnosable, with a plain
// translation for the two most common cases.
function describeDbError(
  error: { code?: string; message?: string } | null,
): string {
  if (!error) return "Could not save — no row returned (possibly blocked by row security).";
  if (error.code === "23505") return "That SKU is already used by another product.";
  if (error.code === "42501") return "Blocked by row security — your account role may not allow this.";
  if (error.code === "42703" || error.message?.includes("does not exist")) {
    return `Database error: ${error.message} — the latest database migration (0004) has probably not been run yet.`;
  }
  return `Database error${error.code ? ` (${error.code})` : ""}: ${error.message ?? "unknown"}`;
}

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
  // Unchecked checkboxes are absent from FormData.
  const availableInPos = formData.get("available_in_pos") !== null;

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
    available_in_pos: availableInPos,
  };

  if (productId) {
    const { error } = await supabase.from("products").update(row).eq("id", productId);
    if (error) {
      console.error("saveProduct update failed:", error);
      return { error: describeDbError(error) };
    }
    revalidatePath(`/products/${productId}`);
    revalidatePath("/products");
    return {};
  }

  const { data: created, error } = await supabase
    .from("products")
    .insert(row)
    .select("id")
    .single();
  if (error || !created) {
    console.error("saveProduct insert failed:", error);
    return { error: describeDbError(error) };
  }
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
  const date = String(formData.get("date") ?? "");

  if (!productId || !qty) return { error: "Enter the adjustment quantity (+ or −)." };
  if (!reason) return { error: "A reason is required for adjustments." };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_txns").insert({
    product_id: productId,
    type: "adjustment",
    qty,
    reason,
    ...(date ? { date } : {}),
    user_id: profile.id,
  });
  if (error) return { error: "Could not record the adjustment." };

  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  return {};
}
