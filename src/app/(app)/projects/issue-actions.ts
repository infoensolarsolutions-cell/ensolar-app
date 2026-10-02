"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getWriteBranchId } from "@/lib/branch";
import { todayManila } from "@/lib/format";

// Guess the registry type from the product name so issued serials land in
// the right category without extra typing.
function guessEquipmentType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("inverter")) return "inverter";
  if (n.includes("battery") || n.includes("lifepo") || n.includes("batt ")) return "battery";
  if (n.includes("panel") || n.includes("module")) return "solar_panel";
  return "other";
}

// Issue store-room materials to a project: stock goes down, the project's
// material cost goes up at cost price (Spec §5.3 → §5.2 profitability).
// Serial numbers typed with the issue are registered in the Equipment
// Registry (or, if already registered from delivery, assigned to the
// project) with today's date.
export async function issueToProject(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const projectId = String(formData.get("project_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  const serials = String(formData.get("serials") ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (!projectId || !productId) return { error: "Choose a product." };
  if (!(qty > 0)) return { error: "Enter the quantity to issue." };
  if (serials.length > qty) {
    return { error: `You listed ${serials.length} serial numbers but are issuing only ${qty} unit(s).` };
  }
  const dupInForm = serials.find((s, i) => serials.findIndex((x) => x.toLowerCase() === s.toLowerCase()) !== i);
  if (dupInForm) return { error: `Serial ${dupInForm} is listed twice.` };

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

  // Resolve serials BEFORE moving stock, so a conflict stops everything
  // cleanly: known in-stock units get assigned, unknown serials get
  // registered, units already on another project block the issue.
  const today = todayManila();
  const toAssign: string[] = [];
  const toRegister: string[] = [];
  for (const serial of serials) {
    const { data: existing } = await supabase
      .from("equipment_units")
      .select("id, project_id, projects (project_no)")
      .ilike("serial_no", serial)
      .maybeSingle();
    if (!existing) {
      toRegister.push(serial);
    } else if (!existing.project_id || existing.project_id === projectId) {
      toAssign.push(existing.id);
    } else {
      const proj = Array.isArray(existing.projects) ? existing.projects[0] : existing.projects;
      return {
        error: `Serial ${serial} is already issued to project ${proj?.project_no ?? "another project"} — check the Equipment Registry.`,
      };
    }
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

  // Equipment Registry: assign known units, register new serials.
  if (toAssign.length) {
    await supabase
      .from("equipment_units")
      .update({ project_id: projectId, issued_date: today })
      .in("id", toAssign);
  }
  if (toRegister.length) {
    const branchId = await getWriteBranchId(supabase, profile.branch_id);
    await supabase.from("equipment_units").insert(
      toRegister.map((serial) => ({
        equipment_type: guessEquipmentType(product.name),
        model: `${product.name} (${product.sku})`,
        serial_no: serial,
        project_id: projectId,
        issued_date: today,
        branch_id: branchId,
        created_by: profile.id,
      })),
    );
  }

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "materials_issued",
    detail: { product: product.sku, qty, amount },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/products");
  if (serials.length) revalidatePath("/equipment");
  return {};
}
