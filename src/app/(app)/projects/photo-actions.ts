"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function uploadProjectPhoto(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") return { error: "Not allowed." };

  const projectId = String(formData.get("project_id") ?? "");
  const phase = String(formData.get("phase") ?? "during");
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 200);
  const photo = formData.get("photo") as File | null;

  if (!projectId) return { error: "Invalid project." };
  if (!photo || photo.size === 0) return { error: "Choose a photo first." };
  if (photo.size > 15 * 1024 * 1024) return { error: "Photo too large (max 15 MB)." };
  if (!["before", "during", "after"].includes(phase)) return { error: "Invalid phase." };

  const supabase = await createClient();
  const ext = (photo.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
  const storagePath = `projects/${projectId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("project-photos")
    .upload(storagePath, photo);
  if (uploadError) return { error: "Could not upload the photo." };

  const { error } = await supabase.from("project_photos").insert({
    project_id: projectId,
    storage_path: storagePath,
    caption: caption || null,
    phase,
    uploaded_by: profile.id,
  });
  if (error) return { error: "Could not save the photo record." };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "photo_uploaded",
    detail: { phase, caption },
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
