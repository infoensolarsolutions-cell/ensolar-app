import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "owner" | "office_staff" | "technician" | "customer";

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  office_staff: "Office Staff",
  technician: "Technician",
  customer: "Customer",
};

export type Profile = {
  id: string;
  name: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
  email: string;
};

// Returns the signed-in user's profile, or null when signed out.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, name, phone, role, active")
    .eq("id", user.id)
    .single();
  if (!data) return null;

  return { ...data, email: user.email ?? "" } as Profile;
}

// Authoritative server-side role gate. Call at the top of every server
// action, route handler, and protected page/layout.
export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.active) redirect("/login");
  if (!roles.includes(profile.role)) {
    redirect(profile.role === "customer" ? "/portal" : "/");
  }
  return profile;
}

export const STAFF_ROLES: UserRole[] = ["owner", "office_staff", "technician"];
