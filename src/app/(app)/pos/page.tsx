import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PosScreen, type PosProduct } from "./pos-screen";

export const metadata: Metadata = { title: "POS" };

export default async function PosPage() {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products_with_stock")
    .select("id, sku, name, unit, selling_price, on_hand")
    .eq("active", true)
    .eq("available_in_pos", true)
    .gt("on_hand", 0)
    .order("name")
    .overrideTypes<PosProduct[]>();

  return (
    <>
      <TopBar title="POS — Walk-in Sale" backHref="/more" />
      <div className="px-4 pt-3">
        <Link href="/pos/summary" className="text-sm font-medium text-brand-green-dark underline">
          Today’s sales summary →
        </Link>
      </div>
      <PosScreen products={products ?? []} />
    </>
  );
}
