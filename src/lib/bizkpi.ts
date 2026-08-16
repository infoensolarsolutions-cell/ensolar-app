import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatPeso, todayManila, TIMEZONE } from "@/lib/format";

// Business KPI engine: every number the owner needs to watch, each with a
// traffic-light status and plain advice. Thresholds are deliberately simple
// and documented next to each metric so they can be tuned in one place.

export type KpiStatus = "good" | "warn" | "bad";

export type Kpi = {
  group: string;
  label: string;
  value: string;
  sub?: string;
  status: KpiStatus;
  advice?: string;
};

export type CashflowMonth = {
  label: string; // e.g. "Mar 2026"
  cashIn: number;
  cashOut: number;
  net: number;
};

export type BusinessKpis = {
  kpis: Kpi[];
  cashflow: CashflowMonth[];
  bad: number;
  warn: number;
  computedAt: string;
};

// Industry rule of thumb for solar installation contractors: net profit
// margins commonly land between 5% and 15% of revenue. The owner set the
// healthy bar at ≥20%; below 5% is danger territory (one bad project can
// wipe the year).
const NET_MARGIN_HEALTHY = 0.20;
const NET_MARGIN_DANGER = 0.05;

const d = (iso: string, days: number) => {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};

export async function computeBusinessKpis(
  supabase: SupabaseClient,
): Promise<BusinessKpis> {
  const today = todayManila();
  const monthStart = `${today.slice(0, 7)}-01`;
  const lastMonthStart = d(monthStart, -1).slice(0, 7) + "-01";
  const dayOfMonth = Number(today.slice(8, 10));
  const ninetyDaysAgo = d(today, -90);
  const sixMonthsAgo = d(today, -183);

  // Last six calendar months (oldest first, current month last).
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    let y = Number(today.slice(0, 4));
    let m = Number(today.slice(5, 7)) - i;
    while (m < 1) { m += 12; y -= 1; }
    monthKeys.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  const sixMonthStart = `${monthKeys[0]}-01`;
  const monthFmt = new Intl.DateTimeFormat("en-PH", {
    timeZone: TIMEZONE, month: "short", year: "numeric",
  });
  const tsMonthFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit",
  });
  const tsMonth = (iso: string) => tsMonthFmt.format(new Date(iso));

  const [
    payRes,
    posRes,
    costRes,
    expRes,
    projRes,
    marginRes,
    leadsNowRes,
    leadsPrevRes,
    quotesRes,
    followupRes,
    ticketRes,
    stockRes,
    maintRes,
  ] = await Promise.all([
    supabase.from("payments").select("amount, received_at").gte("received_at", sixMonthStart).limit(5000),
    supabase.from("pos_sales").select("total, sold_at").gte("sold_at", sixMonthStart).limit(5000),
    supabase.from("project_costs").select("amount, date").gte("date", sixMonthStart).limit(5000),
    supabase.from("expenses").select("amount, date").gte("date", sixMonthStart).limit(5000),
    supabase
      .from("projects")
      .select("status, target_date, contract_amount, payment_milestones (amount, due_date, sort_order), payments (amount, milestone_id)")
      .neq("status", "closed")
      .limit(1000),
    supabase
      .from("projects")
      .select("contract_amount, completed_date, project_costs (amount)")
      .eq("status", "completed")
      .gte("completed_date", sixMonthsAgo)
      .gt("contract_amount", 0),
    supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", lastMonthStart)
      .lt("created_at", monthStart),
    supabase
      .from("quotations")
      .select("status, total, valid_until, created_at")
      .is("deleted_at", null)
      .gte("created_at", ninetyDaysAgo),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .lte("next_followup_at", today)
      .not("status", "in", "(won,lost)"),
    supabase
      .from("service_tickets")
      .select("reported_at")
      .in("status", ["open", "in_progress"]),
    supabase
      .from("products_with_stock")
      .select("on_hand, reorder_level")
      .eq("active", true)
      .gt("reorder_level", 0),
    supabase
      .from("maintenance_reminders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("due_date", today),
  ]);

  const kpis: Kpi[] = [];
  const dayMs = 86400000;

  // ── Cash flow by month: in = collections + POS; out = expenses + project
  // costs (payroll posts into expenses via payroll runs) ──────────────────
  const inByMonth = new Map<string, number>();
  const outByMonth = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string, amt: number) =>
    map.set(key, (map.get(key) ?? 0) + amt);

  for (const p of payRes.data ?? []) bump(inByMonth, tsMonth(p.received_at as string), Number(p.amount));
  for (const s of posRes.data ?? []) bump(inByMonth, tsMonth(s.sold_at as string), Number(s.total));
  for (const e of expRes.data ?? []) bump(outByMonth, (e.date as string).slice(0, 7), Number(e.amount));
  for (const c of costRes.data ?? []) bump(outByMonth, (c.date as string).slice(0, 7), Number(c.amount));

  const cashflow: CashflowMonth[] = monthKeys.map((key) => {
    const cashIn = inByMonth.get(key) ?? 0;
    const cashOut = outByMonth.get(key) ?? 0;
    return {
      label: monthFmt.format(new Date(`${key}-15T00:00:00Z`)),
      cashIn,
      cashOut,
      net: cashIn - cashOut,
    };
  });

  // Net profit margin over the last 3 FULL months (current month excluded —
  // half a month of revenue against full bills would mislead).
  const fullMonths = monthKeys.slice(2, 5);
  const marginRevenue = fullMonths.reduce((s, k) => s + (inByMonth.get(k) ?? 0), 0);
  const marginCosts = fullMonths.reduce((s, k) => s + (outByMonth.get(k) ?? 0), 0);
  const netMargin = marginRevenue > 0 ? (marginRevenue - marginCosts) / marginRevenue : null;

  // ── Money ──────────────────────────────────────────────────────────────
  const currentKey = monthKeys[5];
  const prevKey = monthKeys[4];
  const revNow = (payRes.data ?? [])
    .filter((p) => tsMonth(p.received_at as string) === currentKey)
    .reduce((s, p) => s + Number(p.amount), 0);
  const revPrev = (payRes.data ?? [])
    .filter((p) => tsMonth(p.received_at as string) === prevKey)
    .reduce((s, p) => s + Number(p.amount), 0);
  kpis.push({
    group: "Money",
    label: "Revenue collected this month",
    value: formatPeso(revNow),
    sub: `last month ${formatPeso(revPrev)}`,
    // No collections halfway into the month is a red flag; well behind last
    // month late in the month is amber.
    status:
      revNow === 0 && dayOfMonth >= 15
        ? "bad"
        : dayOfMonth >= 20 && revNow < revPrev * 0.5
          ? "warn"
          : "good",
    advice: "Collections, not sales, pay the bills — chase due milestones first.",
  });

  const thisMonthFlow = cashflow[5];
  kpis.push({
    group: "Money",
    label: "Cash flow this month",
    value: `${formatPeso(thisMonthFlow.net)} net`,
    sub: `${formatPeso(thisMonthFlow.cashIn)} in · ${formatPeso(thisMonthFlow.cashOut)} out`,
    status:
      thisMonthFlow.cashOut > 0 && thisMonthFlow.net < 0
        ? "bad"
        : thisMonthFlow.cashOut > thisMonthFlow.cashIn * 0.9 && thisMonthFlow.cashOut > 0
          ? "warn"
          : "good",
    advice: "More cash going out than coming in — delay purchases, chase collections, or both.",
  });

  kpis.push({
    group: "Money",
    label: "Net profit margin (last 3 full months)",
    value: netMargin === null ? "no revenue in the period" : `${Math.round(netMargin * 100)}%`,
    sub: "solar installer benchmark: 5–15% typical · your healthy bar: ≥20%",
    status:
      netMargin === null
        ? "warn"
        : netMargin < NET_MARGIN_DANGER
          ? "bad"
          : netMargin < NET_MARGIN_HEALTHY
            ? "warn"
            : "good",
    advice:
      "Net margin is what's left after ALL costs. Below the industry range, check pricing first, then material costs, then overhead.",
  });

  // Receivables: same rules as the Receivables Aging report, condensed.
  let outstanding = 0;
  let overdue = 0;
  for (const p of projRes.data ?? []) {
    const paysP = (p.payments ?? []) as { amount: number; milestone_id: string | null }[];
    const paid = paysP.reduce((s, x) => s + Number(x.amount), 0);
    const rem = Number(p.contract_amount) - paid;
    const milestones = (p.payment_milestones ?? []) as { amount: number; due_date: string | null; sort_order: number }[];
    if (rem <= 0.005) continue;
    if (!milestones.length && p.status === "completed") continue; // archive
    outstanding += rem;
    // Overdue portion: unpaid milestone value already past due, capped at rem.
    const dueSum = milestones
      .filter((m) => m.due_date && m.due_date < today)
      .reduce((s, m) => s + Number(m.amount), 0);
    overdue += Math.min(Math.max(0, dueSum - paid), rem);
  }
  kpis.push({
    group: "Money",
    label: "Outstanding receivables",
    value: formatPeso(outstanding),
    sub: overdue > 0.005 ? `${formatPeso(overdue)} past due` : "nothing past due",
    status:
      overdue > outstanding * 0.25 && overdue > 50000
        ? "bad"
        : overdue > 0.005
          ? "warn"
          : "good",
    advice: "Money overdue loses value and gets harder to collect the longer it sits.",
  });

  const margins = (marginRes.data ?? [])
    .map((p) => {
      const cost = (p.project_costs ?? []).reduce(
        (s: number, c: { amount: number }) => s + Number(c.amount),
        0,
      );
      return (Number(p.contract_amount) - cost) / Number(p.contract_amount);
    })
    .filter((m) => Number.isFinite(m));
  const avgMargin = margins.length
    ? margins.reduce((s, m) => s + m, 0) / margins.length
    : null;
  kpis.push({
    group: "Money",
    label: "Average gross margin (completed, 6 months)",
    value: avgMargin === null ? "no data yet" : `${Math.round(avgMargin * 100)}%`,
    sub: margins.length ? `${margins.length} project${margins.length === 1 ? "" : "s"}` : "record project costs to unlock",
    status:
      avgMargin === null ? "warn" : avgMargin < 0.15 ? "bad" : avgMargin < 0.25 ? "warn" : "good",
    advice: "Below ~25% gross margin, one bad surprise per project erases the profit.",
  });

  // ── Sales ──────────────────────────────────────────────────────────────
  const leadsNow = leadsNowRes.count ?? 0;
  const leadsPrev = leadsPrevRes.count ?? 0;
  kpis.push({
    group: "Sales",
    label: "New leads this month",
    value: String(leadsNow),
    sub: `last month ${leadsPrev}`,
    status:
      leadsNow === 0 && dayOfMonth >= 10
        ? "bad"
        : leadsPrev > 0 && dayOfMonth >= 20 && leadsNow < leadsPrev / 2
          ? "warn"
          : "good",
    advice: "Empty lead intake today is empty installations in 2–3 months — post, ask for referrals, run a promo.",
  });

  const quotes = quotesRes.data ?? [];
  const accepted = quotes.filter((q) => q.status === "accepted").length;
  const decided = quotes.filter((q) => ["accepted", "rejected", "expired"].includes(q.status)).length;
  const winRate = decided ? accepted / decided : null;
  kpis.push({
    group: "Sales",
    label: "Quotation win rate (90 days)",
    value: winRate === null ? "no decided quotes" : `${Math.round(winRate * 100)}%`,
    sub: `${accepted} won of ${decided} decided`,
    status: winRate === null ? "warn" : winRate < 0.15 ? "bad" : winRate < 0.35 ? "warn" : "good",
    advice: "A low win rate usually means pricing, speed of response, or lead quality — check which.",
  });

  const pipelineQ = quotes.filter((q) => q.status === "sent");
  const pipelineValue = pipelineQ.reduce((s, q) => s + Number(q.total), 0);
  const expiring = pipelineQ.filter(
    (q) => q.valid_until && q.valid_until >= today && q.valid_until <= d(today, 7),
  ).length;
  kpis.push({
    group: "Sales",
    label: "Pipeline (quotations awaiting reply)",
    value: formatPeso(pipelineValue),
    sub: `${pipelineQ.length} quotation${pipelineQ.length === 1 ? "" : "s"}${expiring ? ` · ${expiring} expiring within 7 days` : ""}`,
    status: pipelineQ.length === 0 ? "warn" : expiring > 0 ? "warn" : "good",
    advice: "Call before a quotation lapses — a reminder at the right moment closes deals.",
  });

  const overdueFollowups = followupRes.count ?? 0;
  kpis.push({
    group: "Sales",
    label: "Follow-ups overdue",
    value: String(overdueFollowups),
    status: overdueFollowups > 10 ? "bad" : overdueFollowups > 0 ? "warn" : "good",
    advice: "Leads go cold fast — clear the follow-up queue daily.",
  });

  // ── Projects ───────────────────────────────────────────────────────────
  const active = (projRes.data ?? []).filter((p) => ["pending", "ongoing"].includes(p.status as string));
  const late = active.filter((p) => p.target_date && (p.target_date as string) < today);
  kpis.push({
    group: "Projects",
    label: "Active projects",
    value: String(active.length),
    sub: late.length ? `${late.length} past target date` : "all on schedule",
    status: late.length >= 2 ? "bad" : late.length === 1 ? "warn" : "good",
    advice: "Late projects delay the final payment and generate complaints — reschedule or reinforce the crew.",
  });

  // ── After-sales & stock ────────────────────────────────────────────────
  const tickets = ticketRes.data ?? [];
  const oldestDays = tickets.length
    ? Math.max(
        ...tickets.map((t) =>
          Math.round((Date.now() - new Date(t.reported_at as string).getTime()) / dayMs),
        ),
      )
    : 0;
  kpis.push({
    group: "After-sales & stock",
    label: "Open service tickets",
    value: String(tickets.length),
    sub: tickets.length ? `oldest ${oldestDays} day${oldestDays === 1 ? "" : "s"}` : undefined,
    status: oldestDays > 14 ? "bad" : tickets.length > 0 ? "warn" : "good",
    advice: "Slow after-sales service is the fastest way to lose referrals.",
  });

  const lowStock = (stockRes.data ?? []).filter(
    (p) => Number(p.on_hand) <= Number(p.reorder_level),
  ).length;
  kpis.push({
    group: "After-sales & stock",
    label: "Products at or below reorder level",
    value: String(lowStock),
    status: lowStock > 5 ? "bad" : lowStock > 0 ? "warn" : "good",
    advice: "Stock-outs delay installations — reorder before you hit zero.",
  });

  const maintOverdue = maintRes.count ?? 0;
  kpis.push({
    group: "After-sales & stock",
    label: "Maintenance visits overdue",
    value: String(maintOverdue),
    status: maintOverdue > 3 ? "bad" : maintOverdue > 0 ? "warn" : "good",
    advice: "Free yearly cleaning visits are cheap goodwill — schedule them before customers ask.",
  });

  return {
    kpis,
    cashflow,
    bad: kpis.filter((k) => k.status === "bad").length,
    warn: kpis.filter((k) => k.status === "warn").length,
    computedAt: today,
  };
}
