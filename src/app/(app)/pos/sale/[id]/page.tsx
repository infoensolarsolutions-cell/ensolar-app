import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso } from "@/lib/format";

export const metadata: Metadata = { title: "Sale" };

type SaleLine = {
  sku: string; name: string; unit: string; qty: number;
  unit_price: number; line_total: number;
};

export default async function SalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const { data: sale } = await supabase
    .from("pos_sales")
    .select("id, sale_no, lines, subtotal, discount, total, payment_method, provider_ref, sold_at, profiles:sold_by (name)")
    .eq("id", id)
    .single();
  if (!sale) notFound();

  const lines = sale.lines as SaleLine[];
  const seller = Array.isArray(sale.profiles) ? sale.profiles[0] : sale.profiles;

  return (
    <>
      <TopBar title={sale.sale_no} backHref="/pos" />
      <div className="space-y-4 p-4">
        <p className="rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-800">
          ✓ Sale completed — stock has been deducted
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex justify-between text-sm">
            <span className="font-bold">{sale.sale_no}</span>
            <span className="text-gray-500">{formatDate(sale.sold_at)}</span>
          </div>
          <ul className="mt-2 divide-y divide-gray-100">
            {lines.map((l, i) => (
              <li key={i} className="flex justify-between py-2 text-sm">
                <span className="text-gray-800">
                  {l.name}
                  <span className="ml-1 text-xs text-gray-500">× {l.qty}</span>
                </span>
                <span className="font-semibold">{formatPeso(l.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatPeso(sale.subtotal)}</span></div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between"><span className="text-gray-600">Discount</span><span>-{formatPeso(sale.discount)}</span></div>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>TOTAL</span><span className="text-brand-green-dark">{formatPeso(sale.total)}</span>
            </div>
            <p className="pt-1 text-xs text-gray-500">
              {sale.payment_method}{sale.provider_ref && ` · ref ${sale.provider_ref}`}
              {seller?.name && ` · sold by ${seller.name}`}
            </p>
          </div>
        </div>

        <a
          href={`/api/pos/${sale.id}/pdf`}
          target="_blank"
          className="block w-full rounded-xl border border-brand-green px-4 py-3.5 text-center text-base font-semibold text-brand-green-dark"
        >
          Print / PDF receipt
        </a>
        <Link
          href="/pos"
          className="block w-full rounded-xl bg-brand-green px-4 py-3.5 text-center text-base font-semibold text-white"
        >
          New sale
        </Link>
      </div>
    </>
  );
}
