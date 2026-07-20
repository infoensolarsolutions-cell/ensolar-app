"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateMyProfile(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await getProfile();
  if (!profile) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  if (!name) return { error: "Please enter your name." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ name, phone: phone || null })
    .eq("id", profile.id);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/more");
  revalidatePath("/");
  return { saved: true };
}
