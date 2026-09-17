import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatThread, type ChatMessage } from "@/app/(app)/messages/[userId]/chat-thread";

export const metadata: Metadata = { title: "Message Ensolar" };

export default async function PortalMessagesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "customer") redirect("/messages");

  // The company side of the thread is the owner's account.
  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("profiles")
    .select("id, name")
    .eq("role", "owner")
    .eq("active", true)
    .limit(1)
    .single();

  if (!owner) {
    return (
      <div className="p-6 text-center text-sm text-gray-600">
        Messaging is not available right now — please call (035) 531-6455.
      </div>
    );
  }

  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, body, created_at")
    .or(
      `and(sender_id.eq.${owner.id},recipient_id.eq.${profile.id}),and(sender_id.eq.${profile.id},recipient_id.eq.${owner.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(200)
    .overrideTypes<ChatMessage[]>();

  return (
    <div className="flex min-h-dvh flex-col bg-brand-yellow/5">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link href="/portal" className="text-xl text-gray-500">
            ‹
          </Link>
          <Image src="/branding/logo.svg" alt="Ensolar" width={30} height={30} />
          <div>
            <p className="text-sm font-bold leading-tight text-gray-900">
              Ensolar Solutions
            </p>
            <p className="text-[10px] leading-tight text-gray-500">
              We usually reply within office hours (Mon–Sat)
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {(messages ?? []).length === 0 && (
          <p className="px-6 pt-6 text-center text-sm text-gray-500">
            👋 Hello {profile.name || "there"}! Message us about anything —
            questions, concerns, or just to tell us how your solar system is
            doing. We read everything.
          </p>
        )}
        <ChatThread
          meId={profile.id}
          contactId={owner.id}
          initialMessages={messages ?? []}
        />
      </main>
    </div>
  );
}
