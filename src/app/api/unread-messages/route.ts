import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Unread-message count for the signed-in user; polled by the nav badge.
export async function GET() {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ count: 0 });

  const supabase = await createClient();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profile.id)
    .is("read_at", null);

  return new NextResponse(JSON.stringify({ count: count ?? 0 }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
