import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso } from "@/lib/format";
import { ProductForm } from "../product-form";
import { StockForms } from "./stock-forms";

export const metadata: Metadata = { title: "Product" };

const TXN_LABELS: Record<string, string> = {
  in: "Stock in",
  sale: "POS sale",
  project_issue: "Issued to project",
  ticket_issue: "Used in service",
  adjustment: "Adjustment",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: txns }] = await Promise.all([
    supabase.from("products_with_stock").select("*").eq("id", id).single(),
    supabase
      .from("inventory_txns")
      .select("id, type, qty, unit_cost, supplier, reference_no, reason, date, profiles:user_id (name)")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!product) notFound();

  return (
    <>
      <TopBar title={product.sku} backHref="/products" />
      <div className="space-y-4 pb-4">
        <div className="p-4 pb-0">
          <Link href="/products" className="text-sm font-medium text-brand-green-dark">
            ← All products
          </Link>
          <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-3xl font-extrabold text-gray-900">
              {Number(product.on_hand)}{" "}
              <span className="text-base font-semibold text-gray-500">{product.unit} on hand</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Value at cost: {formatPeso(Number(product.on_hand) * Number(product.cost_price))}
              {Number(product.reorder_level) > 0 &&
                ` · Reorder at ${Number(product.reorder_level)}`}
            </p>
          </div>
          <div className="mt-3">
            <StockForms productId={product.id} />
          </div>
        </div>

        <ProductForm product={product} />

        <div className="px-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">Stock movements</p>
            {!txns?.length && <p className="text-sm text-gray-500">No movements yet.</p>}
            <ul className="divide-y divide-gray-100">
              {txns?.map((t) => {
                const who = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
                return (
                  <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{TXN_LABELS[t.type] ?? t.type}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(t.date)}
                        {t.supplier && ` · ${t.supplier}`}
                        {t.reference_no && ` · ${t.reference_no}`}
                        {t.reason && ` · ${t.reason}`}
                        {who?.name && ` · ${who.name}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-bold ${
                        Number(t.qty) > 0 ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {Number(t.qty) > 0 ? "+" : ""}
                      {Number(t.qty)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
