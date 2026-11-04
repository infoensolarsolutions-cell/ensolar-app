import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso } from "@/lib/format";
import { OrderActions } from "./order-actions";

export const metadata: Metadata = { title: "Online Orders" };

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-gray-100 text-gray-600",
  reserved: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-400",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "✅ Paid online",
  pending: "⏳ Payment pending",
  reserved: "📝 Reserved — collect payment",
  failed: "❌ Failed",
  cancelled: "Cancelled",
};

export default async function OrdersPage() {
  const profile = await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("online_orders")
    .select(
      "id, order_no, offer_name, package_price, amount, customer_name, phone, email, address, status, paid_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const paidTotal = (orders ?? [])
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + Number(o.amount), 0);
  const open = (orders ?? []).filter((o) => o.status === "reserved" || o.status === "pending").length;

  return (
    <>
      <TopBar title="Online Orders" backHref="/more" />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Reservation fees collected</p>
            <p className="text-base font-extrabold text-gray-900">{formatPeso(paidTotal)}</p>
          </div>
          <div className={`rounded-xl border p-3 ${open ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
            <p className="text-xs text-gray-500">Needing follow-up</p>
            <p className={`text-base font-extrabold ${open ? "text-amber-800" : "text-gray-900"}`}>{open}</p>
          </div>
        </div>

        {!orders?.length && (
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            No online orders yet. Share your packages page —{" "}
            <span className="font-semibold">/packages</span> — in your Facebook
            ads; every reservation and payment lands here (and as a lead in CRM).
          </p>
        )}

        {orders?.map((o) => (
          <div key={o.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">
                  {o.order_no} · {o.customer_name}
                </p>
                <p className="text-xs text-gray-600">{o.offer_name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  📱 {o.phone}
                  {o.email && ` · ${o.email}`}
                </p>
                {o.address && <p className="text-xs text-gray-500">📍 {o.address}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-extrabold text-gray-900">{formatPeso(Number(o.amount))}</p>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[o.status] ?? ""}`}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-400">
              <span>
                {formatDate(o.created_at)}
                {o.paid_at && ` · paid ${formatDate(o.paid_at)}`}
              </span>
              {profile.role === "owner" && <OrderActions orderId={o.id} status={o.status} />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
