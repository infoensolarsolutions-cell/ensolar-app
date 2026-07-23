"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Photos are uploaded straight from the browser to storage (no server
// action body limits); this registers the uploaded files on the project.
export async function registerProjectPhotos(
  projectId: string,
  phase: string,
  caption: string,
  storagePaths: string[],
): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") return { error: "Not allowed." };

  const cleanCaption = String(caption ?? "").trim().slice(0, 200);
  if (!projectId) return { error: "Invalid project." };
  if (!["before", "during", "after"].includes(phase)) return { error: "Invalid phase." };
  if (!Array.isArray(storagePaths) || storagePaths.length === 0) {
    return { error: "No photos to register." };
  }
  if (storagePaths.length > 20) return { error: "Too many photos at once." };
  if (storagePaths.some((p) => !p.startsWith(`projects/${projectId}/`))) {
    return { error: "Invalid photo path." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("project_photos").insert(
    storagePaths.map((storage_path) => ({
      project_id: projectId,
      storage_path,
      caption: cleanCaption || null,
      phase,
      uploaded_by: profile.id,
    })),
  );
  if (error) return { error: `Could not save the photo records: ${error.message}` };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "photo_uploaded",
    detail: { phase, caption: cleanCaption, count: String(storagePaths.length) },
  });

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function deleteProjectPhoto(
  photoId: string,
  projectId: string,
): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!profile || !["owner", "office_staff"].includes(profile.role)) {
    return { error: "Only office staff can delete photos." };
  }

  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("project_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();
  if (!photo) return { error: "Photo not found." };

  await supabase.storage.from("project-photos").remove([photo.storage_path]);
  await supabase.from("project_photos").delete().eq("id", photoId);

  revalidatePath(`/projects/${projectId}`);
  return {};
}
