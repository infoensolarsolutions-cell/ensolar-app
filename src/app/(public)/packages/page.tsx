import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { formatPeso } from "@/lib/format";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Solar Packages — Ensolar Solutions",
  description:
    "Choose your hybrid solar package and reserve online — GCash, Maya, QR, bank or card. Installed by licensed electrical engineers in Dumaguete & Negros Oriental.",
};

type Offer = {
  id: string;
  name: string;
  kw: number | null;
  headline: string | null;
  details: string | null;
  price: number;
  reservation_fee: number;
};

// The Facebook ad links straight here (optionally with ?c=<campaign id>
// for attribution, same as the inquiry form).
export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const campaign = /^[0-9a-f-]{36}$/i.test(c ?? "") ? `?c=${c}` : "";

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supabase
    .from("package_offers")
    .select("id, name, kw, headline, details, price, reservation_fee")
    .eq("active", true)
    .order("sort");
  const offers = (data ?? []) as Offer[];

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <header className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5">
        <Image src="/branding/logo.svg" alt="Ensolar" width={40} height={40} />
        <div>
          <p className="font-bold leading-tight">Ensolar Solutions Installation Services</p>
          <p className="text-xs italic text-brand-green">LINKING THE SUN</p>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-4 pt-2 text-center">
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Choose your solar package.
          <span className="block text-brand-green">Reserve online in 2 minutes.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-300">
          Pay the reservation fee securely by GCash, Maya, QR Ph, online
          banking or card — then our licensed engineers handle the site
          inspection, design and installation. Reservation fee is deducted
          from your package price.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-10 sm:grid-cols-2 lg:grid-cols-3">
        {!offers.length && (
          <p className="col-span-full rounded-2xl bg-white/10 p-6 text-center text-sm text-gray-300">
            Packages are being updated — please check back shortly, or{" "}
            <Link href="/inquire" className="font-semibold text-brand-green underline">
              send us an inquiry
            </Link>{" "}
            and we&apos;ll contact you.
          </p>
        )}
        {offers.map((o) => (
          <div key={o.id} className="flex flex-col rounded-2xl bg-white p-5 text-gray-900 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-green-dark">
              {o.kw ? `${o.kw} kWp Hybrid` : "Package"}
            </p>
            <h2 className="mt-1 text-lg font-extrabold">{o.name}</h2>
            {o.headline && <p className="text-sm text-gray-600">{o.headline}</p>}
            <p className="mt-3 text-2xl font-extrabold">
              {o.price > 0 ? formatPeso(o.price) : "Ask for price"}
            </p>
            {o.details && (
              <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                {o.details.split("\n").filter(Boolean).map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-brand-green">✓</span>
                    {d}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto pt-4">
              <Link
                href={`/packages/${o.id}${campaign}`}
                className="block rounded-xl bg-brand-green px-4 py-3 text-center text-sm font-bold text-white active:bg-brand-green-dark"
              >
                Reserve for {formatPeso(o.reservation_fee)}
              </Link>
              <p className="mt-1.5 text-center text-[11px] text-gray-500">
                Deducted from the package price · GCash · Maya · QR · Bank · Card
              </p>
            </div>
          </div>
        ))}
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-400">
        <p className="mx-auto max-w-2xl px-4">
          Prices are for Deye hybrid inverter systems with LVTOPSUN LiFePO4
          battery. Transportation will be added for project sites outside
          Metro Dumaguete.
        </p>
        <p className="mt-2">Ensolar Solutions Installation Services · 19 Ciriaco Espina St., Taclobo, Dumaguete City</p>
        <p className="mt-1">(035) 531-6455 · 0953-561-2557 (TM) · 0961-885-6986 (Smart) · info.ensolarsolutions@gmail.com</p>
        <p className="mt-2">
          Not ready to reserve?{" "}
          <Link href="/inquire" className="font-semibold text-brand-green underline">
            Request a free quotation instead
          </Link>
        </p>
      </footer>
    </div>
  );
}
