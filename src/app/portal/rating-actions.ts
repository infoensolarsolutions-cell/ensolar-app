"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function submitRating(
  projectId: string,
  rating: number,
  comment: string,
): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!profile || profile.role !== "customer") return { error: "Not allowed." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Pick 1 to 5 stars." };
  }

  const supabase = await createClient();
  // RLS allows inserting only for the customer's own project; the unique
  // project_id constraint prevents rating twice.
  const { error } = await supabase.from("csat_ratings").insert({
    project_id: projectId,
    rating,
    comment: comment.trim().slice(0, 500) || null,
    created_by: profile.id,
  });
  if (error) {
    if (error.message.includes("duplicate")) return { error: "Already rated — thank you!" };
    return { error: "Could not save your rating. Please try again." };
  }

  revalidatePath("/portal");
  return {};
}
