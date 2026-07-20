"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveCampaign(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const channel = String(formData.get("channel") ?? "").trim().slice(0, 100);
  const cost = Math.max(0, Number(formData.get("cost") ?? 0) || 0);
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");

  if (!name || !channel) return { error: "Name and channel are required." };
  if (endDate && startDate && endDate < startDate) {
    return { error: "End date is before start date." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").insert({
    name,
    channel,
    cost,
    ...(startDate ? { start_date: startDate } : {}),
    end_date: endDate || null,
    created_by: profile.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };
  revalidatePath("/campaigns");
  return {};
}

export async function endCampaign(campaignId: string): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const { error } = await supabase
    .from("campaigns")
    .update({ end_date: today })
    .eq("id", campaignId)
    .is("end_date", null);
  if (error) return { error: `Could not end: ${error.message}` };
  revalidatePath("/campaigns");
  return {};
}

export async function deleteCampaign(campaignId: string): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);
  if ((count ?? 0) > 0) {
    return { error: "This campaign already has leads attributed to it." };
  }
  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (error) return { error: `Could not delete: ${error.message}` };
  revalidatePath("/campaigns");
  return {};
}

export async function saveAnnouncement(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const body = String(formData.get("body") ?? "").trim().slice(0, 1000);
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title,
    body: body || null,
    created_by: profile.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };
  revalidatePath("/campaigns");
  revalidatePath("/portal");
  return {};
}

export async function toggleAnnouncement(
  announcementId: string,
  active: boolean,
): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({ active })
    .eq("id", announcementId);
  if (error) return { error: `Could not update: ${error.message}` };
  revalidatePath("/campaigns");
  revalidatePath("/portal");
  return {};
}
