"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function inviteCustomerToPortal(
  customerId: string,
  projectId: string,
  slot: "primary" | "secondary" = "primary",
): Promise<{ error?: string; done?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("name, email, email2, profile_id, profile_id2")
    .eq("id", customerId)
    .single();
  if (!customer) return { error: "Customer not found." };

  const email = slot === "primary" ? customer.email : customer.email2;
  const linked = slot === "primary" ? customer.profile_id : customer.profile_id2;
  if (linked) return { error: "This contact already has portal access." };
  if (!email) {
    return {
      error:
        slot === "primary"
          ? "Add an email address to the customer record first."
          : "Add the second email address to the customer record first.",
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Server key not configured — cannot send invites yet." };
  }

  const origin = (await headers()).get("origin") ?? "https://ensolar-app.vercel.app";
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
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
    .update(
      slot === "primary"
        ? { profile_id: data.user.id }
        : { profile_id2: data.user.id },
    )
    .eq("id", customerId);
  if (linkError) return { error: "Invite sent but linking failed — contact support." };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "portal_invited",
    detail: { email },
  });

  revalidatePath(`/projects/${projectId}`);
  return { done: true };
}

// Edit the customer's portal emails straight from the project page — needed
// for projects without a lead record (historical imports, direct projects).
export async function updateCustomerEmails(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const customerId = String(formData.get("customer_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().slice(0, 200) || null;
  const email2 = String(formData.get("email2") ?? "").trim().slice(0, 200) || null;
  if (!customerId) return { error: "Missing customer reference." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ email, email2 })
    .eq("id", customerId);
  if (error) return { error: `Could not save: ${error.message}` };

  if (projectId) {
    await supabase.from("project_events").insert({
      project_id: projectId,
      user_id: profile.id,
      event: "note",
      detail: { text: "updated the customer's email addresses" },
    });
    revalidatePath(`/projects/${projectId}`);
  }
  return { saved: true };
}
