"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function setOrderStatus(
  orderId: string,
  status: "paid" | "cancelled",
): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { error } = await supabase
    .from("online_orders")
    .update({
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", orderId);
  if (error) return { error: `Could not save: ${error.message}` };
  revalidatePath("/orders");
  return {};
}
