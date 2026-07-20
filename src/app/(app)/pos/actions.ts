"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type CartItem = { product_id: string; qty: number };

export async function completeSale(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");

  let cart: CartItem[];
  try {
    cart = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Invalid cart." };
  }
  cart = cart.filter((i) => i.product_id && Number(i.qty) > 0);
  if (!cart.length) return { error: "The cart is empty." };

  const discount = Math.max(0, Number(formData.get("discount") ?? 0) || 0);
  const method = String(formData.get("method") ?? "");
  const providerRef = String(formData.get("provider_ref") ?? "").trim().slice(0, 100);
  if (!["cash", "gcash", "maya", "card", "bank_transfer"].includes(method)) {
    return { error: "Choose a payment method." };
  }

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products_with_stock")
    .select("id, sku, name, unit, selling_price, on_hand, active")
    .in("id", cart.map((i) => i.product_id));

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const lines = [];
  for (const item of cart) {
    const p = byId.get(item.product_id);
    if (!p || !p.active) return { error: "A product in the cart is unavailable." };
    if (Number(p.on_hand) < item.qty) {
      return { error: `Not enough stock of ${p.name}: only ${p.on_hand} ${p.unit} left.` };
    }
    lines.push({
      product_id: p.id,
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      qty: item.qty,
      unit_price: Number(p.selling_price),
      line_total: Math.round(item.qty * Number(p.selling_price) * 100) / 100,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  if (discount > subtotal) return { error: "Discount cannot exceed the subtotal." };
  const total = Math.round((subtotal - discount) * 100) / 100;

  const { data: saleNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_doc_type: "S",
  });
  if (noError || !saleNo) return { error: "Could not generate a sale number." };

  const { data: sale, error: saleError } = await supabase
    .from("pos_sales")
    .insert({
      sale_no: saleNo,
      lines,
      subtotal,
      discount,
      total,
      payment_method: method,
      provider_ref: providerRef || null,
      sold_by: profile.id,
    })
    .select("id")
    .single();
  if (saleError || !sale) {
    console.error("completeSale insert failed:", saleError);
    return { error: `Could not save the sale: ${saleError?.message ?? "unknown"}` };
  }

  const { error: txnError } = await supabase.from("inventory_txns").insert(
    lines.map((l) => ({
      product_id: l.product_id,
      type: "sale",
      qty: -l.qty,
      unit_cost: 0,
      ref_table: "pos_sales",
      ref_id: sale.id,
      user_id: profile.id,
    })),
  );
  if (txnError) console.error("completeSale stock deduction failed:", txnError);

  revalidatePath("/products");
  redirect(`/pos/sale/${sale.id}`);
}
