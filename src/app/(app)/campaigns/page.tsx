import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayManila } from "@/lib/format";
import {
  CampaignForm,
  CampaignItem,
  AnnouncementsPanel,
  type CampaignRow,
} from "./campaign-panels";

export const metadata: Metadata = { title: "Marketing" };

export default async function CampaignsPage() {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();
  const today = todayManila();

  const [{ data: campaigns }, { data: leads }, { data: announcements }] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select("id, name, channel, cost, start_date, end_date")
        .order("start_date", { ascending: false })
        .limit(50),
      supabase.from("leads").select("campaign_id, status").not("campaign_id", "is", null),
      supabase
        .from("announcements")
        .select("id, title, body, active, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const rows: CampaignRow[] = (campaigns ?? []).map((c) => {
    const mine = (leads ?? []).filter((l) => l.campaign_id === c.id);
    return {
      id: c.id,
      name: c.name,
      channel: c.channel,
      cost: Number(c.cost),
      start_date: c.start_date,
      end_date: c.end_date,
      active: c.end_date === null || c.end_date >= today,
      leads: mine.length,
      won: mine.filter((l) => l.status === "won").length,
      share_url: `https://ensolar-app.vercel.app/inquire?c=${c.id}`,
    };
  });

  return (
    <>
      <TopBar title="Marketing" backHref="/more" />
      <div className="space-y-4 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        <CampaignForm />
        {rows.length === 0 && (
          <p className="pt-2 text-center text-sm text-gray-500">
            No campaigns yet. Create one and share its inquiry link — leads
            arriving through it are attributed automatically.
          </p>
        )}
        {rows.map((c) => (
          <CampaignItem key={c.id} campaign={c} />
        ))}
        <AnnouncementsPanel announcements={announcements ?? []} />
      </div>
    </>
  );
}
