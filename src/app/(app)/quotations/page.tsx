import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveBranch, getBranches } from "@/lib/branch";
import { formatDate, formatPeso, todayManila } from "@/lib/format";
import { StatusBadge } from "./status-badge";
import { ListTrashButton } from "./list-trash-button";
import { ExpireLapsedButton } from "./expire-lapsed-button";

export const metadata: Metadata = { title: "Quotations" };

type QuotationRow = {
  id: string;
  quote_no: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  valid_until: string | null;
  total: number;
  created_at: string;
  customers: { name: string } | null;
  projects: { id: string } | null;
};

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("owner", "office_staff");
  const { q } = await searchParams;
  const term = (q ?? "").trim().slice(0, 100);
  const supabase = await createClient();

  const activeBranch = await getActiveBranch(await getBranches(supabase));
  const SELECT =
    "id, quote_no, status, valid_until, total, created_at, customers (name), projects (id)";

  let quotations: QuotationRow[];
  if (term) {
    // Search the whole history (not just the latest 100): by quote number,
    // or by customer name (inner join so the ilike applies to the customer).
    const like = `%${term}%`;
    let byNo = supabase
      .from("quotations")
      .select(SELECT)
      .is("deleted_at", null)
      .ilike("quote_no", like)
      .order("created_at", { ascending: false })
      .limit(100);
    let byCustomer = supabase
      .from("quotations")
      .select(
        "id, quote_no, status, valid_until, total, created_at, customers!inner (name), projects (id)",
      )
      .is("deleted_at", null)
      .ilike("customers.name", like)
      .order("created_at", { ascending: false })
      .limit(100);
    if (activeBranch !== "all") {
      byNo = byNo.eq("branch_id", activeBranch);
      byCustomer = byCustomer.eq("branch_id", activeBranch);
    }
    const [a, b] = await Promise.all([
      byNo.overrideTypes<QuotationRow[]>(),
      byCustomer.overrideTypes<QuotationRow[]>(),
    ]);
    const seen = new Set<string>();
    quotations = [...(a.data ?? []), ...(b.data ?? [])]
      .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
      .sort((x, y) => (x.created_at < y.created_at ? 1 : -1));
  } else {
    let listQuery = supabase
      .from("quotations")
      .select(SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (activeBranch !== "all") listQuery = listQuery.eq("branch_id", activeBranch);
    quotations = (await listQuery.overrideTypes<QuotationRow[]>()).data ?? [];
  }

  const { count: trashed } = await supabase
    .from("quotations")
    .select("id", { count: "exact", head: true })
    .not("deleted_at", "is", null);

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

        <form method="get" className="flex gap-2 lg:col-span-full">
          <input
            type="search"
            name="q"
            defaultValue={term}
            placeholder="🔍 Search quote no. or customer name…"
            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <button className="shrink-0 rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white active:bg-brand-green-dark">
            Search
          </button>
          {term && (
            <Link
              href="/quotations"
              className="shrink-0 self-center text-sm font-medium text-gray-500 underline"
            >
              clear
            </Link>
          )}
        </form>

        {term && quotations.length > 0 && (
          <p className="text-xs font-medium text-gray-500 lg:col-span-full">
            {quotations.length} quotation{quotations.length === 1 ? "" : "s"} matching
            &ldquo;{term}&rdquo; — searched across the whole history.
          </p>
        )}

        {!quotations.length && (
          <p className="pt-8 text-center text-sm text-gray-500 lg:col-span-full">
            {term ? <>No quotations match &ldquo;{term}&rdquo;.</> : "No quotations yet."}
          </p>
        )}

        {(() => {
          // Sent quotations awaiting a customer decision, soonest expiry
          // first. Hidden while searching — results take the stage.
          if (term) return null;
          const awaiting = quotations
            .filter((q) => q.status === "sent")
            .sort((a, b) => (a.valid_until ?? "9999") < (b.valid_until ?? "9999") ? -1 : 1);
          if (!awaiting.length) return null;
          const days = (d: string) =>
            Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000);
          return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 lg:col-span-full">
              <p className="mb-2 text-sm font-bold text-amber-900">
                ⏳ Awaiting customer response ({awaiting.length}) — follow up before they expire
              </p>
              <ul className="divide-y divide-amber-100">
                {awaiting.map((q) => {
                  const d = q.valid_until ? days(q.valid_until) : null;
                  return (
                    <li key={q.id}>
                      <Link
                        href={`/quotations/${q.id}`}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {q.quote_no} · {q.customers?.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatPeso(q.total)} · sent {formatDate(q.created_at)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                            d === null
                              ? "bg-gray-100 text-gray-600"
                              : d < 0
                                ? "bg-red-100 text-red-700"
                                : d <= 7
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {d === null
                            ? "no expiry"
                            : d < 0
                              ? `expired ${-d}d ago`
                              : d === 0
                                ? "expires today"
                                : `expires in ${d}d`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <ExpireLapsedButton
                lapsedCount={
                  awaiting.filter((q) => q.valid_until && days(q.valid_until) < 0).length
                }
              />
            </div>
          );
        })()}

        {quotations.map((q) => (
          <div key={q.id} className="relative rounded-xl border border-gray-200 bg-white">
            {!q.projects && (
              <ListTrashButton quotationId={q.id} quoteNo={q.quote_no} />
            )}
            <Link href={`/quotations/${q.id}`} className="block p-4">
              <div
                className={`flex items-start justify-between gap-2 ${
                  !q.projects ? "pr-8" : ""
                }`}
              >
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
          </div>
        ))}
      </div>
    </>
  );
}
