"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deyeEnabled, refreshStation } from "@/lib/deye";

export async function linkDeyeStation(
  projectId: string,
  stationId: string,
  stationName: string,
): Promise<{ error?: string }> {
  await requireRole("owner");
  if (!deyeEnabled()) return { error: "Deye is not configured." };
  if (!projectId || !stationId) return { error: "Pick a station." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      deye_station_id: stationId,
      deye_station_name: stationName.slice(0, 120) || null,
    })
    .eq("id", projectId);
  if (error) return { error: `Could not link: ${error.message}` };

  // Warm the cache so the panel has data immediately.
  await refreshStation(stationId);
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function unlinkDeyeStation(
  projectId: string,
): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ deye_station_id: null, deye_station_name: null })
    .eq("id", projectId);
  if (error) return { error: `Could not unlink: ${error.message}` };
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function refreshDeyeData(
  projectId: string,
): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff", "technician");
  if (!deyeEnabled()) return { error: "Deye is not configured." };

  // RLS scopes the read — technicians only reach assigned projects.
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("deye_station_id")
    .eq("id", projectId)
    .single();
  if (!project?.deye_station_id) return { error: "No Deye station linked." };

  const res = await refreshStation(project.deye_station_id);
  if (res.error) return { error: res.error };
  revalidatePath(`/projects/${projectId}`);
  return {};
}
