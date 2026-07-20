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
