import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPeso } from "@/lib/format";
import { paymongoEnabled, retrieveCheckoutSession } from "@/lib/paymongo";
import { recordPackageOrderPayment } from "@/lib/paymongo-record";

export const metadata: Metadata = { title: "Thank you — Ensolar Solutions" };

// PayMongo redirects here after checkout. The webhook marks the order paid;
// as a fallback (webhook late or not yet registered) this page checks the
// session directly, same as the portal's /portal/confirm.
export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  let order: { order_no: string; offer_name: string; amount: number; status: string } | null = null;
  if (/^[0-9a-f-]{36}$/i.test(orderId ?? "")) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("online_orders")
        .select("order_no, offer_name, amount, status, provider_session_id")
        .eq("id", orderId)
        .maybeSingle();
      order = data;
      if (data && data.status !== "paid" && data.provider_session_id && paymongoEnabled()) {
        const session = await retrieveCheckoutSession(data.provider_session_id);
        if (session) {
          const { recorded } = await recordPackageOrderPayment(session);
          if (recorded) order = { ...data, status: "paid" };
        }
      }
    } catch {
      order = null;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-4 text-white">
      <Image src="/branding/logo.svg" alt="Ensolar" width={56} height={56} />
      <div className="mt-5 w-full max-w-md rounded-2xl bg-white p-6 text-center text-gray-900">
        <p className="text-2xl">🌞</p>
        <h1 className="mt-1 text-xl font-extrabold text-brand-green-dark">
          Salamat! Your reservation is in.
        </h1>
        {order ? (
          <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm">
            <p className="font-bold">{order.offer_name}</p>
            <p className="text-gray-600">
              Reservation no. <span className="font-semibold">{order.order_no}</span>
            </p>
            <p className="mt-1">
              {order.status === "paid" ? (
                <span className="font-bold text-green-700">
                  ✅ Payment of {formatPeso(Number(order.amount))} received
                </span>
              ) : (
                <span className="font-semibold text-amber-700">
                  ⏳ Confirming your payment of {formatPeso(Number(order.amount))}…
                </span>
              )}
            </p>
          </div>
        ) : null}
        <p className="mt-3 text-sm text-gray-600">
          Our team will contact you within 1 working day to schedule your
          free site inspection. Keep your reservation number handy.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Questions? Call (035) 531-6455 or 0953-561-2557.
        </p>
        <Link
          href="/welcome"
          className="mt-4 inline-block rounded-xl bg-brand-green px-5 py-2.5 text-sm font-bold text-white"
        >
          Visit our site
        </Link>
      </div>
    </div>
  );
}
