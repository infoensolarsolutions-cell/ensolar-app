import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SizingCalculator, type SizingProduct } from "./calculator";

export const metadata: Metadata = { title: "Solar Sizing" };

// Walk-in sizing tool: staff enter the customer's monthly bill or kWh and
// get panel count, inverter/battery suggestions, mounting materials and a
// priced quotation on the spot.
export default async function SizingPage() {
  const profile = await requireRole("owner", "office_staff", "technician");
  const canQuote = ["owner", "office_staff"].includes(profile.role);

  let products: SizingProduct[] = [];
  if (canQuote) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("id, sku, name, unit, selling_price")
      .eq("active", true)
      .order("name");
    products = (data ?? []).map((p) => ({ ...p, selling_price: Number(p.selling_price) }));
  }

  return (
    <>
      <TopBar title="Solar PV Sizing" backHref="/" />
      <div className="p-4">
        <SizingCalculator products={products} canQuote={canQuote} />
      </div>
    </>
  );
}
