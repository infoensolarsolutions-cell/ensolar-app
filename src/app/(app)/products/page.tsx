import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso } from "@/lib/format";

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
  searchParams: Promise<{ q?: string; kind?: string }>;
}) {
  await requireRole("owner", "office_staff", "technician");
  const { q, kind } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products_with_stock")
    .select("*")
    .order("name")
    .limit(200);
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,category.ilike.%${q}%`);
  if (kind === "pos") query = query.eq("available_in_pos", true);
  if (kind === "materials") query = query.eq("available_in_pos", false);
  const [{ data: products }, { data: txnDates }] = await Promise.all([
    query.overrideTypes<StockRow[]>(),
    supabase
      .from("inventory_txns")
      .select("product_id, qty, date")
      .order("date", { ascending: false })
      .limit(3000),
  ]);

  // Latest stock-in (qty > 0) and stock-out (qty < 0) date per product.
  const lastIn = new Map<string, string>();
  const lastOut = new Map<string, string>();
  for (const t of txnDates ?? []) {
    const target = Number(t.qty) > 0 ? lastIn : lastOut;
    if (!target.has(t.product_id)) target.set(t.product_id, t.date);
  }

  const stockValue = (products ?? []).reduce(
    (s, p) => s + Number(p.on_hand) * Number(p.cost_price),
    0,
  );

  return (
    <>
      <TopBar title="Products & Stock" />
      <div className="space-y-3 p-4">
        <form action="/products" className="flex gap-2 lg:max-w-md">
          {kind && <input type="hidden" name="kind" value={kind} />}
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

        <div className="flex flex-wrap gap-2">
          {[
            [undefined, "All products"],
            ["pos", "POS items"],
            ["materials", "Project materials only"],
          ].map(([value, label]) => {
            const active = (kind ?? undefined) === value || (!kind && !value);
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (value) params.set("kind", value);
            const qs = params.toString();
            return (
              <Link
                key={label}
                href={`/products${qs ? `?${qs}` : ""}`}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${
                  active
                    ? "border-brand-green bg-brand-green text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
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
          <p className="pt-6 text-center text-sm text-gray-500">No products found.</p>
        )}

        {/* Phones: tappable cards */}
        <div className="space-y-3 lg:hidden">
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
                <p className="text-right text-[11px] text-gray-400">
                  Last in: {lastIn.has(p.id) ? formatDate(lastIn.get(p.id)!) : "—"} · Last
                  out: {lastOut.has(p.id) ? formatDate(lastOut.get(p.id)!) : "—"}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Desktop: full table */}
        {!!products?.length && (
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 text-right font-semibold">Price</th>
                  <th className="px-4 py-3 text-right font-semibold">Cost</th>
                  <th className="px-4 py-3 text-right font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Last In</th>
                  <th className="px-4 py-3 font-semibold">Last Out</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => {
                  const low =
                    p.reorder_level > 0 && Number(p.on_hand) <= Number(p.reorder_level);
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 ${p.active ? "" : "opacity-50"}`}>
                      <td className="px-4 py-2.5">
                        <Link href={`/products/${p.id}`} className="font-semibold text-gray-900 hover:underline">
                          {p.name}
                        </Link>
                        <p className="text-xs text-gray-500">{p.sku}</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{p.category ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                        {formatPeso(p.selling_price)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {formatPeso(p.cost_price)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                        {Number(p.on_hand)}{" "}
                        <span className="font-normal text-gray-500">{p.unit}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {lastIn.has(p.id) ? formatDate(lastIn.get(p.id)!) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {lastOut.has(p.id) ? formatDate(lastOut.get(p.id)!) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {!p.active ? (
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-600">
                            INACTIVE
                          </span>
                        ) : low ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-800">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/products/${p.id}`}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
