import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso, todayManila } from "@/lib/format";
import { StatusBadge } from "../status-badge";
import { QuotationActions } from "./quotation-actions";

export const metadata: Metadata = { title: "Quotation" };

type Detail = {
  id: string;
  quote_no: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  valid_until: string | null;
  subtotal: number;
  discount: number;
  total: number;
  terms: string | null;
  created_at: string;
  customers: { name: string; phone: string | null; address: string | null; barangay: string | null } | null;
  quotation_items: {
    id: string;
    description: string;
    qty: number;
    unit_price: number;
    line_total: number;
    sort_order: number;
  }[];
  projects: { id: string; project_no: string } | null;
};

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const { data: q } = await supabase
    .from("quotations")
    .select(
      "id, quote_no, status, valid_until, subtotal, discount, total, terms, created_at, customers (name, phone, address, barangay), quotation_items (id, description, qty, unit_price, line_total, sort_order), projects (id, project_no)",
    )
    .eq("id", id)
    .single()
    .overrideTypes<Detail>();

  if (!q) notFound();

  const items = [...q.quotation_items].sort((a, b) => a.sort_order - b.sort_order);
  const today = todayManila();

  return (
    <>
      <TopBar title={q.quote_no} backHref="/quotations" />
      <div className="space-y-4 p-4">
        <Link href="/quotations" className="text-sm font-medium text-brand-green-dark">
          ← All quotations
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">{q.quote_no}</p>
              <p className="text-sm text-gray-600">{q.customers?.name}</p>
            </div>
            <StatusBadge status={q.status} validUntil={q.valid_until} today={today} />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Created {formatDate(q.created_at)}
            {q.valid_until && <> · Valid until {formatDate(q.valid_until)}</>}
          </p>
          {q.projects && (
            <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
              ✓ Converted to project {q.projects.project_no}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 font-semibold text-gray-900">Items</p>
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <p className="text-sm text-gray-800">{item.description}</p>
                  <p className="text-xs text-gray-500">
                    {item.qty} × {formatPeso(item.unit_price)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">{formatPeso(item.line_total)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatPeso(q.subtotal)}</span>
            </div>
            {q.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span>-{formatPeso(q.discount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-bold">
              <span>TOTAL</span>
              <span className="text-brand-green-dark">{formatPeso(q.total)}</span>
            </div>
          </div>
        </div>

        {q.terms && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-1 font-semibold text-gray-900">Terms</p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{q.terms}</p>
          </div>
        )}

        <a
          href={`/api/quotations/${q.id}/pdf`}
          target="_blank"
          className="block w-full rounded-xl border border-brand-green px-4 py-3.5 text-center text-base font-semibold text-brand-green-dark active:bg-brand-green/5"
        >
          Download PDF
        </a>

        <QuotationActions
          quotationId={q.id}
          status={q.status}
          hasProject={!!q.projects}
        />
      </div>
    </>
  );
}
