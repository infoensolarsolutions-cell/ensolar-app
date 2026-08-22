import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TIMEZONE } from "@/lib/format";
import { COST_TYPES, type CostType } from "@/lib/crm";

// BIR books of accounts (cash basis), generated from the records already in
// the system: Sales Book from payments + POS sales, Purchase Book from
// expenses + project costs, General Ledger as per-account monthly postings.
// TIN/address columns for suppliers stay blank — the system doesn't collect
// them — for the bookkeeper to complete where required.

export type SaleRow = {
  date: string;
  reference: string;
  customer: string;
  address: string;
  amount: number;
};

export type PurchaseRow = {
  date: string;
  particulars: string;
  account: string;
  amount: number;
};

export type LedgerRow = {
  account: string;
  group: "Income" | "Direct costs" | "Operating expenses";
  values: number[];
  total: number;
};

export type BirBooks = {
  year: number;
  months: number;
  sales: SaleRow[];
  purchases: PurchaseRow[];
  ledger: LedgerRow[];
};

export async function computeBirBooks(
  supabase: SupabaseClient,
  year: number,
): Promise<BirBooks> {
  const from = `${year}-01-01`;
  const toExclusive = `${year + 1}-01-01`;

  const [payRes, posRes, expRes, costRes] = await Promise.all([
    supabase
      .from("payments")
      .select("or_no, amount, received_at, projects (project_no, customers (name, address, barangay))")
      .gte("received_at", from)
      .lt("received_at", toExclusive)
      .order("received_at")
      .limit(10000),
    supabase
      .from("pos_sales")
      .select("sale_no, total, sold_at")
      .gte("sold_at", from)
      .lt("sold_at", toExclusive)
      .order("sold_at")
      .limit(10000),
    supabase
      .from("expenses")
      .select("date, category, description, amount")
      .gte("date", from)
      .lt("date", toExclusive)
      .order("date")
      .limit(10000),
    supabase
      .from("project_costs")
      .select("date, type, description, amount, projects (project_no)")
      .gte("date", from)
      .lt("date", toExclusive)
      .order("date")
      .limit(10000),
  ]);

  const dayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const day = (iso: string) => dayFmt.format(new Date(iso));
  const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);

  const sales: SaleRow[] = [
    ...(payRes.data ?? []).map((p) => {
      const project = one(p.projects) as
        | { project_no?: string; customers?: unknown }
        | null;
      const customer = one(project?.customers ?? null) as
        | { name?: string; address?: string | null; barangay?: string | null }
        | null;
      return {
        date: day(p.received_at as string),
        reference: `${p.or_no}${project?.project_no ? ` (${project.project_no})` : ""}`,
        customer: customer?.name ?? "",
        address: [customer?.address, customer?.barangay].filter(Boolean).join(", "),
        amount: Number(p.amount),
      };
    }),
    ...(posRes.data ?? []).map((s) => ({
      date: day(s.sold_at as string),
      reference: s.sale_no as string,
      customer: "Walk-in / store sale",
      address: "",
      amount: Number(s.total),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.reference.localeCompare(b.reference));

  const purchases: PurchaseRow[] = [
    ...(expRes.data ?? []).map((e) => ({
      date: e.date as string,
      particulars: (e.description as string | null) || (e.category as string),
      account: e.category as string,
      amount: Number(e.amount),
    })),
    ...(costRes.data ?? []).map((c) => {
      const project = one(c.projects) as { project_no?: string } | null;
      const typeLabel = COST_TYPES[c.type as CostType] ?? (c.type as string);
      return {
        date: c.date as string,
        particulars: `${(c.description as string | null) || typeLabel}${project?.project_no ? ` — ${project.project_no}` : ""}`,
        account: `Project costs — ${typeLabel}`,
        amount: Number(c.amount),
      };
    }),
  ].sort((a, b) => a.date.localeCompare(b.date));

  // General ledger: per-account monthly totals.
  const months = 12;
  const zeros = () => Array.from({ length: months }, () => 0);
  const accounts = new Map<string, { group: LedgerRow["group"]; values: number[] }>();
  const post = (account: string, group: LedgerRow["group"], date: string, amount: number) => {
    if (!accounts.has(account)) accounts.set(account, { group, values: zeros() });
    const i = Number(date.slice(5, 7)) - 1;
    if (i >= 0 && i < months) accounts.get(account)!.values[i] += amount;
  };

  for (const p of payRes.data ?? []) post("Sales — project collections", "Income", day(p.received_at as string), Number(p.amount));
  for (const s of posRes.data ?? []) post("Sales — store (POS)", "Income", day(s.sold_at as string), Number(s.total));
  for (const c of costRes.data ?? []) {
    const typeLabel = COST_TYPES[c.type as CostType] ?? (c.type as string);
    post(`Project costs — ${typeLabel}`, "Direct costs", c.date as string, Number(c.amount));
  }
  for (const e of expRes.data ?? []) post(e.category as string, "Operating expenses", e.date as string, Number(e.amount));

  const groupOrder: LedgerRow["group"][] = ["Income", "Direct costs", "Operating expenses"];
  const ledger: LedgerRow[] = [...accounts.entries()]
    .map(([account, { group, values }]) => ({
      account,
      group,
      values,
      total: values.reduce((s, v) => s + v, 0),
    }))
    .sort(
      (a, b) =>
        groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) || b.total - a.total,
    );

  return { year, months, sales, purchases, ledger };
}
