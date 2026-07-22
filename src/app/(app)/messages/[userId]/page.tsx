import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { getProfile, ROLE_LABELS, type UserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatThread, type ChatMessage } from "./chat-thread";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") redirect("/login");
  const { userId } = await params;
  if (userId === profile.id) redirect("/messages");
  const supabase = await createClient();

  const [{ data: contact }, { data: messages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, role, active")
      .eq("id", userId)
      .neq("role", "customer")
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, sender_id, recipient_id, body, created_at")
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${profile.id}),and(sender_id.eq.${profile.id},recipient_id.eq.${userId})`,
      )
      .order("created_at", { ascending: true })
      .limit(200)
      .overrideTypes<ChatMessage[]>(),
  ]);

  if (!contact) notFound();

  return (
    <>
      <TopBar
        title={`${contact.name || "Chat"} · ${ROLE_LABELS[contact.role as UserRole]}`}
        backHref="/messages"
      />
      <ChatThread
        meId={profile.id}
        contactId={contact.id}
        initialMessages={messages ?? []}
      />
    </>
  );
}
