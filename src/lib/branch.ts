import "server-only";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Branch context. The owner picks a branch (or "all") with the switcher;
// the choice lives in a cookie. Staff with a home branch write into it.

export const BRANCH_COOKIE = "ensolar-branch";

export type Branch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
};

export async function getBranches(supabase: SupabaseClient): Promise<Branch[]> {
  const { data } = await supabase
    .from("branches")
    .select("id, code, name, address, phone, active")
    .order("created_at");
  return (data ?? []) as Branch[];
}

// The branch the current viewer is looking at: a branch id, or "all".
export async function getActiveBranch(branches: Branch[]): Promise<string> {
  const jar = await cookies();
  const raw = jar.get(BRANCH_COOKIE)?.value;
  if (raw && branches.some((b) => b.id === raw)) return raw;
  return "all";
}

// The branch a new record should be stamped with: the viewed branch when a
// concrete one is selected, else the profile's home branch, else MAIN.
export async function getWriteBranchId(
  supabase: SupabaseClient,
  profileBranchId?: string | null,
): Promise<string | null> {
  const branches = await getBranches(supabase);
  const active = await getActiveBranch(branches);
  if (active !== "all") return active;
  if (profileBranchId && branches.some((b) => b.id === profileBranchId)) {
    return profileBranchId;
  }
  return branches.find((b) => b.code === "MAIN")?.id ?? branches[0]?.id ?? null;
}
