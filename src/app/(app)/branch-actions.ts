"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { BRANCH_COOKIE } from "@/lib/branch";

export async function setActiveBranch(branchId: string): Promise<void> {
  await requireRole("owner", "office_staff");
  const jar = await cookies();
  if (branchId === "all") {
    jar.delete(BRANCH_COOKIE);
  } else {
    jar.set(BRANCH_COOKIE, branchId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  revalidatePath("/", "layout");
}
