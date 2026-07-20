import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPeso, todayManila } from "@/lib/format";

export const metadata: Metadata = { title: "Daily Sales" };

type SaleRow = {
  id: string;
  sale_no: string;
  total: number;
  payment_method: string;
  sold_at: string;
  lines: { name: string; qty: number }[];
};

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireRole("owner", "office_staff");
  const { date } = await searchParams;
  const day = date || todayManila();
  const supabase = await createClient();

  // Manila-day window converted to UTC bounds.
  const startUtc = new Date(`${day}T00:00:00+08:00`).toISOString();
  const endUtc = new Date(`${day}T23:59:59.999+08:00`).toISOString();

  const { data: sales } = await supabase
    .from("pos_sales")
    .select("id, sale_no, total, payment_method, sold_at, lines")
    .gte("sold_at", startUtc)
    .lte("sold_at", endUtc)
    .order("sold_at", { ascending: false })
    .overrideTypes<SaleRow[]>();

  const total = (sales ?? []).reduce((s, x) => s + Number(x.total), 0);
  const byMethod = new Map<string, number>();
  let itemCount = 0;
  for (const sale of sales ?? []) {
    byMethod.set(sale.payment_method, (byMethod.get(sale.payment_method) ?? 0) + Number(sale.total));
    for (const line of sale.lines) itemCount += Number(line.qty);
  }

  return (
    <>
      <TopBar title="Daily Sales" backHref="/pos" />
      <div className="space-y-4 p-4">
        <form action="/pos/summary" className="flex gap-2">
          <input name="date" type="date" defaultValue={day}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          <button className="rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white">View</button>
        </form>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-lg font-extrabold text-brand-green-dark">{formatPeso(total)}</p>
            <p className="text-xs text-gray-500">Total sales</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-lg font-extrabold">{sales?.length ?? 0}</p>
            <p className="text-xs text-gray-500">Transactions</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-lg font-extrabold">{itemCount}</p>
            <p className="text-xs text-gray-500">Items sold</p>
          </div>
        </div>

        {byMethod.size > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">By payment method</p>
            <ul className="space-y-1 text-sm">
              {[...byMethod.entries()].map(([m, amt]) => (
                <li key={m} className="flex justify-between">
                  <span className="capitalize text-gray-600">{m.replace("_", " ")}</span>
                  <span className="font-semibold">{formatPeso(amt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 font-semibold text-gray-900">Sales</p>
          {!sales?.length && <p className="text-sm text-gray-500">No sales on this day.</p>}
          <ul className="divide-y divide-gray-100">
            {sales?.map((s) => (
              <li key={s.id}>
                <Link href={`/pos/sale/${s.id}`} className="flex justify-between py-2.5 text-sm">
                  <span>
                    <span className="font-medium text-gray-800">{s.sale_no}</span>
                    <span className="ml-2 text-xs capitalize text-gray-500">{s.payment_method.replace("_", " ")}</span>
                  </span>
                  <span className="font-bold">{formatPeso(s.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
