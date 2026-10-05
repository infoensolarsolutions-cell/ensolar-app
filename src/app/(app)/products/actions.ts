"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getWriteBranchId } from "@/lib/branch";
import { todayManila } from "@/lib/format";
import { parseSerials, serializedEquipmentType } from "@/lib/equipment";

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
  const supplierContact = String(formData.get("supplier_contact") ?? "").trim().slice(0, 200);
  const referenceNo = String(formData.get("reference_no") ?? "").trim().slice(0, 100);
  const date = String(formData.get("date") ?? "");
  const serials = parseSerials(String(formData.get("serials") ?? ""));

  if (!productId || !(qty > 0)) return { error: "Enter the quantity received." };

  const supabase = await createClient();

  // Serialized equipment (inverters, batteries, panels): every delivered
  // unit must be registered with its serial and supplier right here, so the
  // Equipment Registry, project issues and warranty lookups all stay true.
  const { data: product } = await supabase
    .from("products")
    .select("name, sku")
    .eq("id", productId)
    .single();
  if (!product) return { error: "Product not found." };
  const equipmentType = serializedEquipmentType(product.name);
  if (equipmentType) {
    if (!supplier) {
      return { error: "Supplier is required for inverters, batteries and panels — warranty claims need it." };
    }
    if (serials.length !== qty) {
      return {
        error: `This is serialized equipment — enter exactly ${qty} serial number${qty === 1 ? "" : "s"} (one per unit received). You entered ${serials.length}.`,
      };
    }
    const dup = serials.find(
      (s, i) => serials.findIndex((x) => x.toLowerCase() === s.toLowerCase()) !== i,
    );
    if (dup) return { error: `Serial ${dup} is listed twice.` };
    for (const serial of serials) {
      const { data: existing } = await supabase
        .from("equipment_units")
        .select("id")
        .ilike("serial_no", serial)
        .maybeSingle();
      if (existing) {
        return { error: `Serial ${serial} is already registered — check the Equipment Registry.` };
      }
    }
  } else if (serials.length > qty) {
    return { error: `You listed ${serials.length} serials but received only ${qty} unit(s).` };
  }

  const branchId = await getWriteBranchId(supabase, profile.branch_id);
  const { error } = await supabase.from("inventory_txns").insert({
    product_id: productId,
    branch_id: branchId,
    type: "in",
    qty,
    unit_cost: unitCost,
    supplier: supplier || null,
    reference_no: referenceNo || null,
    ...(date ? { date } : {}),
    user_id: profile.id,
  });
  if (error) return { error: "Could not record the delivery." };

  // Register each delivered unit as in-stock in the Equipment Registry.
  if (serials.length) {
    await supabase.from("equipment_units").insert(
      serials.map((serial) => ({
        equipment_type: equipmentType ?? "other",
        model: `${product.name} (${product.sku})`,
        serial_no: serial,
        product_id: productId,
        supplier: supplier || null,
        supplier_contact: supplierContact || null,
        purchase_date: date || todayManila(),
        branch_id: branchId,
        created_by: profile.id,
      })),
    );
    revalidatePath("/equipment");
  }

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
  const branchId = await getWriteBranchId(supabase, profile.branch_id);
  const { error } = await supabase.from("inventory_txns").insert({
    product_id: productId,
    branch_id: branchId,
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
