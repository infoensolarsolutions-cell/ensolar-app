import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OfferCard, type OfferRow } from "./offer-card";

export const metadata: Metadata = { title: "Package Store" };

export default async function PackageSettingsPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const { data } = await supabase
    .from("package_offers")
    .select("id, name, kw, headline, details, price, reservation_fee, active, sort")
    .order("sort")
    .overrideTypes<OfferRow[]>();

  return (
    <>
      <TopBar title="Package Store" backHref="/more" />
      <div className="space-y-3 p-4">
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-900">
          🛒 These packages appear on your public page{" "}
          <span className="font-semibold">/packages</span> — the page your
          Facebook ads should link to. Set each package&apos;s{" "}
          <span className="font-semibold">price</span> and{" "}
          <span className="font-semibold">reservation fee</span>, then switch
          it <span className="font-semibold">Active</span>. Customers pay the
          reservation fee online (GCash, Maya, QR, bank, card once PayMongo is
          connected); every order appears in Online Orders and as a CRM lead.
        </p>
        {data?.map((o) => <OfferCard key={o.id} offer={o} />)}
      </div>
    </>
  );
}
