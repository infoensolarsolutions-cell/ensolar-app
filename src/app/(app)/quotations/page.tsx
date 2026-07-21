import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso, todayManila } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export const metadata: Metadata = { title: "Quotations" };

type QuotationRow = {
  id: string;
  quote_no: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  valid_until: string | null;
  total: number;
  created_at: string;
  customers: { name: string } | null;
};

export default async function QuotationsPage() {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const [{ data: quotations }, { count: trashed }] = await Promise.all([
    supabase
      .from("quotations")
      .select("id, quote_no, status, valid_until, total, created_at, customers (name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100)
      .overrideTypes<QuotationRow[]>(),
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .not("deleted_at", "is", null),
  ]);

  const today = todayManila();

  return (
    <>
      <TopBar title="Quotations" />
      <div className="space-y-3 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 xl:grid-cols-3">
        <div className="flex items-center justify-between gap-2 lg:col-span-full">
          <Link
            href="/quotations/new"
            className="rounded-xl bg-brand-green px-6 py-3.5 text-center text-base font-semibold text-white active:bg-brand-green-dark max-lg:flex-1"
          >
            + New Quotation
          </Link>
          <Link
            href="/quotations/trash"
            className="shrink-0 text-sm font-medium text-gray-500 underline"
          >
            🗑 Recycle Bin{(trashed ?? 0) > 0 ? ` (${trashed})` : ""}
          </Link>
        </div>

        {!quotations?.length && (
          <p className="pt-8 text-center text-sm text-gray-500 lg:col-span-full">
            No quotations yet.
          </p>
        )}

        {quotations?.map((q) => (
          <Link
            key={q.id}
            href={`/quotations/${q.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">{q.quote_no}</p>
                <p className="text-sm text-gray-600">{q.customers?.name}</p>
              </div>
              <StatusBadge status={q.status} validUntil={q.valid_until} today={today} />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">{formatDate(q.created_at)}</span>
              <span className="font-bold text-gray-900">{formatPeso(q.total)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
