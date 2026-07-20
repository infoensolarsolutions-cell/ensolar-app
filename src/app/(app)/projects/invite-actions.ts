"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function inviteCustomerToPortal(
  customerId: string,
  projectId: string,
): Promise<{ error?: string; done?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("name, email, profile_id")
    .eq("id", customerId)
    .single();
  if (!customer) return { error: "Customer not found." };
  if (customer.profile_id) return { error: "This customer already has portal access." };
  if (!customer.email) {
    return { error: "Add an email address to the customer record first." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Server key not configured — cannot send invites yet." };
  }

  const origin = (await headers()).get("origin") ?? "https://ensolar-app.vercel.app";
  const { data, error } = await admin.auth.admin.inviteUserByEmail(customer.email, {
    data: { name: customer.name },
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });
  if (error || !data.user) {
    return {
      error:
        "Could not send the invite. The email may already have an account, or the hourly email limit was reached.",
    };
  }

  const { error: linkError } = await supabase
    .from("customers")
    .update({ profile_id: data.user.id })
    .eq("id", customerId);
  if (linkError) return { error: "Invite sent but linking failed — contact support." };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "portal_invited",
    detail: { email: customer.email },
  });

  revalidatePath(`/projects/${projectId}`);
  return { done: true };
}
