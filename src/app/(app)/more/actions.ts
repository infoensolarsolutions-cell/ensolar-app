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

// Change the signed-in user's own password — no email link needed.
export async function changeMyPassword(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await getProfile();
  if (!profile) return { error: "Not signed in." };

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: `Could not change the password: ${error.message}` };
  return { saved: true };
}
