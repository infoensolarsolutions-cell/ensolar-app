import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// CSV exports for backup/Excel (Spec §8): customers, projects, payments,
// inventory, sales.

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "No data\n";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

const name = (j: unknown): string => {
  const o = Array.isArray(j) ? j[0] : j;
  return (o as { name?: string } | null)?.name ?? "";
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const profile = await getProfile();
  if (!profile || !["owner", "office_staff"].includes(profile.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { entity } = await params;
  const supabase = await createClient();
  let rows: Record<string, unknown>[] = [];

  if (entity === "customers") {
    const { data } = await supabase
      .from("customers")
      .select("name, phone, email, address, barangay, source, referred_by, created_at")
      .order("created_at");
    rows = data ?? [];
  } else if (entity === "projects") {
    const { data } = await supabase
      .from("projects")
      .select(
        "project_no, status, service_type, site_address, contract_amount, start_date, target_date, completed_date, customers (name), payments (amount), project_costs (amount)",
      )
      .order("created_at");
    rows = (data ?? []).map((p) => {
      const paid = (p.payments ?? []).reduce((s: number, x: { amount: number }) => s + Number(x.amount), 0);
      const costs = (p.project_costs ?? []).reduce((s: number, x: { amount: number }) => s + Number(x.amount), 0);
      return {
        project_no: p.project_no,
        customer: name(p.customers),
        status: p.status,
        service_type: p.service_type,
        site_address: p.site_address,
        contract_amount: p.contract_amount,
        total_paid: paid,
        balance: Number(p.contract_amount) - paid,
        total_costs: costs,
        gross_profit: Number(p.contract_amount) - costs,
        start_date: p.start_date,
        target_date: p.target_date,
        completed_date: p.completed_date,
      };
    });
  } else if (entity === "payments") {
    const { data } = await supabase
      .from("payments")
      .select(
        "or_no, received_at, amount, method, provider_ref, notes, projects (project_no), payment_milestones (label), profiles:received_by (name)",
      )
      .order("received_at");
    rows = (data ?? []).map((p) => {
      const project = Array.isArray(p.projects) ? p.projects[0] : p.projects;
      const milestone = Array.isArray(p.payment_milestones) ? p.payment_milestones[0] : p.payment_milestones;
      return {
        or_no: p.or_no,
        date: p.received_at,
        amount: p.amount,
        method: p.method,
        reference: p.provider_ref,
        project_no: project?.project_no ?? "",
        milestone: milestone?.label ?? "",
        received_by: name(p.profiles),
        notes: p.notes,
      };
    });
  } else if (entity === "inventory") {
    const { data } = await supabase
      .from("products_with_stock")
      .select("sku, name, category, unit, cost_price, selling_price, reorder_level, on_hand, active")
      .order("name");
    rows = (data ?? []).map((p) => ({
      ...p,
      stock_value_at_cost: Number(p.on_hand) * Number(p.cost_price),
    }));
  } else if (entity === "sales") {
    const { data } = await supabase
      .from("pos_sales")
      .select("sale_no, sold_at, subtotal, discount, total, payment_method, provider_ref, lines, profiles:sold_by (name)")
      .order("sold_at");
    rows = (data ?? []).map((s) => ({
      sale_no: s.sale_no,
      date: s.sold_at,
      subtotal: s.subtotal,
      discount: s.discount,
      total: s.total,
      payment_method: s.payment_method,
      reference: s.provider_ref,
      items: (s.lines as { name: string; qty: number }[])
        .map((l) => `${l.name} x${l.qty}`)
        .join("; "),
      sold_by: name(s.profiles),
    }));
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  // BOM so Excel opens UTF-8 (₱, ñ) correctly.
  return new NextResponse("﻿" + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ensolar-${entity}-${today}.csv"`,
    },
  });
}
