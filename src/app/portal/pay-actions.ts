"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/paymongo";

export async function payMilestone(
  milestoneId: string,
): Promise<{ error?: string } | never> {
  const profile = await getProfile();
  if (!profile || profile.role !== "customer") return { error: "Not allowed." };

  // The customer's own client can only see their milestones (RLS) — this
  // both authorizes and fetches in one step.
  const supabase = await createClient();
  const { data: milestone } = await supabase
    .from("payment_milestones")
    .select("id, label, amount, project_id, projects (project_no)")
    .eq("id", milestoneId)
    .single();
  if (!milestone) return { error: "Milestone not found." };

  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("milestone_id", milestoneId);
  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Number(milestone.amount) - paid;
  if (remaining < 20) {
    return { error: "This milestone is already settled (or below the ₱20 online minimum)." };
  }

  const project = Array.isArray(milestone.projects)
    ? milestone.projects[0]
    : milestone.projects;
  const origin = (await headers()).get("origin") ?? "https://ensolar-app.vercel.app";

  let session;
  try {
    session = await createCheckoutSession({
      amountCentavos: Math.round(remaining * 100),
      description: `${project?.project_no ?? "Project"} — ${milestone.label}`,
      referenceNumber: milestone.id.slice(0, 8),
      successUrl: `${origin}/portal/confirm`,
      cancelUrl: `${origin}/portal?paid=0`,
      metadata: {
        project_id: milestone.project_id,
        milestone_id: milestone.id,
      },
    });
  } catch {
    return {
      error: "Online payment is temporarily unavailable. Please call (035) 531-6455.",
    };
  }

  // Remembered for the return trip so /portal/confirm can verify and record.
  (await cookies()).set("pm_cs", session.id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 3600,
    path: "/",
  });

  redirect(session.url);
}
