import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { formatPeso } from "@/lib/format";
import { paymongoEnabled } from "@/lib/paymongo";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Reserve your package — Ensolar Solutions" };

export default async function PackageCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { id } = await params;
  const { c } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: offer } = await supabase
    .from("package_offers")
    .select("id, name, kw, headline, details, price, reservation_fee")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  if (!offer) notFound();

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <header className="mx-auto flex max-w-xl items-center gap-3 px-4 py-5">
        <Image src="/branding/logo.svg" alt="Ensolar" width={36} height={36} />
        <p className="font-bold">Ensolar Solutions</p>
        <Link href="/packages" className="ml-auto text-sm text-gray-300 underline">
          ← all packages
        </Link>
      </header>

      <div className="mx-auto max-w-xl space-y-4 px-4 pb-10">
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-green">
            You are reserving
          </p>
          <p className="mt-1 text-lg font-extrabold">{offer.name}</p>
          <div className="mt-2 flex items-baseline justify-between text-sm">
            <span className="text-gray-300">Package price</span>
            <span className="font-bold">
              {Number(offer.price) > 0 ? formatPeso(Number(offer.price)) : "quoted after inspection"}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-gray-300">Pay now (reservation fee)</span>
            <span className="text-xl font-extrabold text-brand-green">
              {formatPeso(Number(offer.reservation_fee))}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            The reservation fee is deducted from your package price. Fully
            refundable if the site inspection finds your roof or electrical
            system unsuitable.
          </p>
        </div>

        <CheckoutForm
          offerId={offer.id}
          campaignId={/^[0-9a-f-]{36}$/i.test(c ?? "") ? c! : null}
          online={paymongoEnabled()}
        />
      </div>
    </div>
  );
}
