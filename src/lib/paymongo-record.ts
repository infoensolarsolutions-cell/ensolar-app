import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CheckoutSession } from "@/lib/paymongo";

// Record a paid checkout session as a payments row. Idempotent on the
// PayMongo payment id, so webhook + return-trip fallback can both run.
export async function recordOnlinePayment(
  session: CheckoutSession,
): Promise<{ recorded: boolean }> {
  const paid = session.payments.find((p) => p.attributes.status === "paid");
  if (!paid) return { recorded: false };

  const projectId = session.metadata?.project_id;
  const milestoneId = session.metadata?.milestone_id || null;
  if (!projectId) return { recorded: false };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("provider_ref", paid.id)
    .maybeSingle();
  if (existing) return { recorded: true };

  const { data: orNo, error: noError } = await admin.rpc("next_doc_no", {
    p_doc_type: "OR",
  });
  if (noError || !orNo) return { recorded: false };

  const { error } = await admin.from("payments").insert({
    or_no: orNo,
    project_id: projectId,
    milestone_id: milestoneId,
    amount: paid.attributes.amount / 100,
    method: "online",
    provider_ref: paid.id,
    notes: "Paid online via PayMongo checkout",
  });
  if (error) return { recorded: false };

  await admin.from("project_events").insert({
    project_id: projectId,
    event: "payment_recorded",
    detail: { or_no: orNo, amount: paid.attributes.amount / 100, method: "online" },
  });

  return { recorded: true };
}
