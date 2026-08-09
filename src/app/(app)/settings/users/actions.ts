"use server";

import { revalidatePath } from "next/cache";
import { requireRole, type UserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES: UserRole[] = ["owner", "office_staff", "technician", "customer"];

export async function updateUserRole(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const me = await requireRole("owner");
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  const active = String(formData.get("active") ?? "true") === "true";

  if (!userId || !ROLES.includes(role)) return { error: "Invalid role." };
  if (userId === me.id) {
    return { error: "You cannot change your own role or status (this prevents locking yourself out)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, active })
    .eq("id", userId);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/settings/users");
  return { saved: true };
}

// Owner rescue for a stuck user: set a temporary password directly — no
// email involved, so it works even when reset emails are limited or lost
// to spam. The user should change it in More → Change password after.
export async function setTempPassword(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const me = await requireRole("owner");
  const userId = String(formData.get("user_id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!userId) return { error: "Missing user reference." };
  if (userId === me.id) {
    return { error: "Change your own password from More → Change password." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Server key not configured — cannot manage passwords." };
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: `Could not set the password: ${error.message}` };
  return { saved: true };
}

// Owner-triggered reset email for a user, same link the Forgot password
// page sends. Subject to Supabase's email rate limits.
export async function sendResetLink(userEmail: string): Promise<{ error?: string; sent?: boolean }> {
  await requireRole("owner");
  if (!userEmail) return { error: "This user has no email on record." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
    redirectTo: "https://ensolar-app.vercel.app/auth/confirm?next=/reset-password",
  });
  if (error) return { error: `Could not send: ${error.message}` };
  return { sent: true };
}

export async function createUser(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  await requireRole("owner");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const role = String(formData.get("role") ?? "") as UserRole;
  const password = String(formData.get("password") ?? "");

  if (!email.includes("@")) return { error: "Please enter a valid email." };
  if (!name) return { error: "Please enter the person's name." };
  if (!ROLES.includes(role)) return { error: "Invalid role." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const admin = createAdminClient();
  // app_metadata.role is picked up by the handle_new_user trigger, so the
  // profile is created with the right role from the start.
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
    app_metadata: { role },
  });
  if (error) return { error: `Could not create: ${error.message}` };

  revalidatePath("/settings/users");
  return { saved: true };
}
