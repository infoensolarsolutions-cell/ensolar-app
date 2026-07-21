import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso } from "@/lib/format";
import { TrashRowActions } from "./trash-row";

export const metadata: Metadata = { title: "Quotations Recycle Bin" };

type TrashRow = {
  id: string;
  quote_no: string;
  total: number;
  deleted_at: string;
  customers: { name: string } | null;
};

export default async function QuotationTrashPage() {
  const profile = await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: quotations } = await supabase
    .from("quotations")
    .select("id, quote_no, total, deleted_at, customers (name)")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(100)
    .overrideTypes<TrashRow[]>();

  return (
    <>
      <TopBar title="Recycle Bin" backHref="/quotations" />
      <div className="space-y-3 p-4">
        <Link href="/quotations" className="text-sm font-medium text-brand-green-dark">
          ← Back to quotations
        </Link>

        <p className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs text-gray-600">
          Quotations here are hidden from the main list but nothing is lost —
          restore anytime.{" "}
          {profile.role === "owner"
            ? "Delete forever is permanent and cannot be undone."
            : "Only the owner can delete forever."}
        </p>

        {!quotations?.length && (
          <p className="pt-8 text-center text-sm text-gray-500">
            The Recycle Bin is empty.
          </p>
        )}

        {quotations?.map((q) => (
          <div
            key={q.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{q.quote_no}</p>
              <p className="truncate text-sm text-gray-600">{q.customers?.name}</p>
              <p className="text-xs text-gray-400">
                {formatPeso(q.total)} · binned {formatDate(q.deleted_at)}
              </p>
            </div>
            <TrashRowActions quotationId={q.id} isOwner={profile.role === "owner"} />
          </div>
        ))}
      </div>
    </>
  );
}
