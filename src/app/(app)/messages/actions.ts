"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function broadcastMessage(
  _prev: { error?: string; sent?: number } | null,
  formData: FormData,
): Promise<{ error?: string; sent?: number }> {
  const profile = await requireRole("owner", "office_staff");
  const body = String(formData.get("body") ?? "").trim().slice(0, 1900);
  if (!body) return { error: "Write the message first." };

  const supabase = await createClient();
  const { data: members, error: memberError } = await supabase
    .from("profiles")
    .select("id")
    .neq("role", "customer")
    .eq("active", true)
    .neq("id", profile.id);
  if (memberError) return { error: `Could not load members: ${memberError.message}` };
  if (!members?.length) return { error: "No other members to send to." };

  const { error } = await supabase.from("messages").insert(
    members.map((m) => ({
      sender_id: profile.id,
      recipient_id: m.id,
      body: `📢 ${body}`,
    })),
  );
  if (error) return { error: `Could not send: ${error.message}` };

  revalidatePath("/messages");
  return { sent: members.length };
}
