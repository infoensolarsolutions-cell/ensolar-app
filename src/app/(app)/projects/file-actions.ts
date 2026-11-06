"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Scanned documents are uploaded straight from the browser to storage (no
// server action body limits); this registers the uploaded files.
export async function registerProjectFiles(
  projectId: string,
  files: { path: string; title: string; mime: string; sizeKb: number }[],
): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") return { error: "Not allowed." };

  if (!projectId) return { error: "Invalid project." };
  if (!Array.isArray(files) || files.length === 0) return { error: "No files to register." };
  if (files.length > 10) return { error: "Too many files at once." };
  if (files.some((f) => !f.path.startsWith(`projects/${projectId}/`))) {
    return { error: "Invalid file path." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("project_files").insert(
    files.map((f) => ({
      project_id: projectId,
      storage_path: f.path,
      title: String(f.title ?? "").trim().slice(0, 200) || "Scanned document",
      mime: String(f.mime ?? "").slice(0, 100) || null,
      size_kb: Number.isFinite(f.sizeKb) ? Math.round(f.sizeKb) : null,
      uploaded_by: profile.id,
    })),
  );
  if (error) return { error: `Could not save the file records: ${error.message}` };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "file_uploaded",
    detail: { count: String(files.length), titles: files.map((f) => f.title).join(", ").slice(0, 300) },
  });

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function deleteProjectFile(
  fileId: string,
  projectId: string,
): Promise<{ error?: string }> {
  const profile = await getProfile();
  if (!profile || !["owner", "office_staff"].includes(profile.role)) {
    return { error: "Only office staff can delete files." };
  }

  const supabase = await createClient();
  const { data: file } = await supabase
    .from("project_files")
    .select("storage_path")
    .eq("id", fileId)
    .single();
  if (!file) return { error: "File not found." };

  await supabase.storage.from("project-files").remove([file.storage_path]);
  await supabase.from("project_files").delete().eq("id", fileId);

  revalidatePath(`/projects/${projectId}`);
  return {};
}
