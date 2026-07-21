import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/format";

export const metadata: Metadata = { title: "Products & Stock" };

type StockRow = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  selling_price: number;
  cost_price: number;
  reorder_level: number;
  active: boolean;
  on_hand: number;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("owner", "office_staff", "technician");
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products_with_stock")
    .select("*")
    .order("name")
    .limit(200);
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,category.ilike.%${q}%`);
  const { data: products } = await query.overrideTypes<StockRow[]>();

  const stockValue = (products ?? []).reduce(
    (s, p) => s + Number(p.on_hand) * Number(p.cost_price),
    0,
  );

  return (
    <>
      <TopBar title="Products & Stock" />
      <div className="space-y-3 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 xl:grid-cols-3">
        <form action="/products" className="flex gap-2 lg:col-span-full lg:max-w-md">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, SKU, category…"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none"
          />
          <button className="rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white">
            Search
          </button>
        </form>

        <div className="flex items-center justify-between lg:col-span-full">
          <p className="text-xs text-gray-500">
            Stock value at cost:{" "}
            <span className="font-bold text-gray-800">{formatPeso(stockValue)}</span>
          </p>
          <Link
            href="/products/new"
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white"
          >
            + Product
          </Link>
        </div>

        {!products?.length && (
          <p className="pt-6 text-center text-sm text-gray-500 lg:col-span-full">No products found.</p>
        )}

        {products?.map((p) => {
          const low = p.reorder_level > 0 && Number(p.on_hand) <= Number(p.reorder_level);
          return (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className={`block rounded-xl border bg-white p-3.5 ${
                low ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200"
              } ${p.active ? "" : "opacity-50"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {p.sku}
                    {p.category && ` · ${p.category}`}
                    {!p.active && " · inactive"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold ${low ? "text-amber-700" : "text-gray-900"}`}>
                    {Number(p.on_hand)} {p.unit}
                  </p>
                  {low && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      LOW STOCK
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-right text-xs text-gray-500">
                Sell {formatPeso(p.selling_price)} · Cost {formatPeso(p.cost_price)}
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
