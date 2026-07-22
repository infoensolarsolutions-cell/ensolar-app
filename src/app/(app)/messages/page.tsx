import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { getProfile, ROLE_LABELS, type UserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") redirect("/login");
  const supabase = await createClient();

  const [{ data: contacts }, { data: unread }, { data: recent }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, role")
        .neq("role", "customer")
        .eq("active", true)
        .neq("id", profile.id)
        .order("name"),
      supabase
        .from("messages")
        .select("sender_id")
        .eq("recipient_id", profile.id)
        .is("read_at", null)
        .limit(500),
      supabase
        .from("messages")
        .select("sender_id, recipient_id, created_at")
        .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  const unreadBy = new Map<string, number>();
  for (const m of unread ?? []) {
    unreadBy.set(m.sender_id, (unreadBy.get(m.sender_id) ?? 0) + 1);
  }
  const lastTalk = new Map<string, string>();
  for (const m of recent ?? []) {
    const other = m.sender_id === profile.id ? m.recipient_id : m.sender_id;
    if (!lastTalk.has(other)) lastTalk.set(other, m.created_at);
  }

  const sorted = [...(contacts ?? [])].sort((a, b) => {
    const ua = unreadBy.get(a.id) ?? 0;
    const ub = unreadBy.get(b.id) ?? 0;
    if (ua !== ub) return ub - ua;
    const ta = lastTalk.get(a.id) ?? "";
    const tb = lastTalk.get(b.id) ?? "";
    return tb.localeCompare(ta);
  });

  return (
    <>
      <TopBar title="Messages" backHref="/more" />
      <div className="space-y-3 p-4 lg:max-w-2xl">
        {!sorted.length && (
          <p className="pt-8 text-center text-sm text-gray-500">
            No teammates yet. Add users under More → Users &amp; Roles.
          </p>
        )}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {sorted.map((c, i) => {
            const count = unreadBy.get(c.id) ?? 0;
            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 active:bg-gray-50 ${
                  i > 0 ? "border-t border-gray-100" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green/10 font-bold text-brand-green-dark">
                    {(c.name || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className={`truncate ${count ? "font-bold" : "font-medium"} text-gray-900`}>
                      {c.name || "Unnamed"}
                    </p>
                    <p className="text-xs text-gray-500">{ROLE_LABELS[c.role as UserRole]}</p>
                  </div>
                </div>
                {count > 0 && (
                  <span className="shrink-0 rounded-full bg-brand-green px-2.5 py-0.5 text-xs font-bold text-white">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
