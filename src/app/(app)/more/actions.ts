"use server";

import { revalidatePath } from "next/cache";
import { getProfile, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { removeSignature, storeSignature } from "@/lib/signature";

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

// Owner's e-signature for generated PDFs (quotations, receipts). Stored
// server-side only — never in the repo or a public URL.
export async function saveMySignature(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner");
  const file = formData.get("signature") as File | null;
  if (!file || file.size === 0) return { error: "Choose an image file of your signature." };
  if (file.size > 1024 * 1024) return { error: "Image too large (max 1 MB) — crop it smaller." };
  // PDF rendering supports PNG/JPG only.
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    return { error: "Use a PNG or JPG image." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${bytes.toString("base64")}`;
  try {
    await storeSignature(profile.id, dataUri);
  } catch {
    return { error: "Could not save — server key not configured." };
  }
  revalidatePath("/more");
  return { saved: true };
}

export async function deleteMySignature(): Promise<{ error?: string }> {
  const profile = await requireRole("owner");
  try {
    await removeSignature(profile.id);
  } catch {
    return { error: "Could not remove — server key not configured." };
  }
  revalidatePath("/more");
  return {};
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
