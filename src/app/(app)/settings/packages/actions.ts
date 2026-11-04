"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveOffer(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  await requireRole("owner");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 150);
  const headline = String(formData.get("headline") ?? "").trim().slice(0, 200);
  const details = String(formData.get("details") ?? "").trim().slice(0, 2000);
  const kwRaw = String(formData.get("kw") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const reservation_fee = Number(formData.get("reservation_fee") ?? 0);
  const active = formData.get("active") === "on";
  const sort = Number(formData.get("sort") ?? 0);

  if (!id) return { error: "Missing package reference." };
  if (!name) return { error: "Enter the package name." };
  if (!(reservation_fee > 0)) return { error: "Reservation fee must be more than zero." };
  if (active && !(price > 0)) {
    return { error: "Set the package price before making it live." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("package_offers")
    .update({
      name,
      headline: headline || null,
      details: details || null,
      kw: kwRaw ? Number(kwRaw) : null,
      price: price > 0 ? price : 0,
      reservation_fee,
      active,
      sort: Number.isFinite(sort) ? sort : 0,
    })
    .eq("id", id);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/settings/packages");
  revalidatePath("/packages");
  return { saved: true };
}
