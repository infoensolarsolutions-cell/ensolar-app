import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InquiryForm } from "../inquire/inquiry-form";

export const metadata: Metadata = {
  title: "Ensolar Solutions — Solar Power for Dumaguete & Negros Oriental",
  description:
    "Solar PV installation, electrical works, CCTV, FDAS and solar pumps in Dumaguete City. Licensed electrical engineer, 25-year panel performance guarantee. Get a free quotation.",
};

// Photos are hotlinked from Unsplash (free to use under the Unsplash License).
const PHOTOS = {
  hero: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1800&q=70&fm=jpg&fit=crop",
  work1: "https://images.unsplash.com/photo-1592833159155-c62df1b65634?w=900&q=70&fm=jpg&fit=crop",
  work2: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=900&q=70&fm=jpg&fit=crop",
  work3: "https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=900&q=70&fm=jpg&fit=crop",
};

const SERVICES = [
  ["☀️", "Solar PV Systems", "On-grid, hybrid and off-grid packages for homes and businesses — design, installation, testing and commissioning."],
  ["⚡", "Electrical Works", "Wiring, panel upgrades and electrical services signed off by a Registered Electrical Engineer."],
  ["📹", "CCTV", "Security camera systems installed and configured for your home or business."],
  ["🔥", "FDAS", "Fire Detection and Alarm Systems for code compliance and peace of mind."],
  ["💧", "Solar Pumps", "Solar-powered water pumping for farms, resorts and off-grid properties."],
  ["🔧", "After-Sales Service", "3-year free service warranty and yearly panel cleaning on every installation."],
] as const;

const PACKAGES = [
  {
    name: "Starter On-Grid",
    tag: null,
    size: "3–5 kWp",
    blurb: "For small homes that want to cut their monthly bill",
    points: [
      "Grid-tied — no batteries needed",
      "Ideal for daytime consumption",
      "Net-metering assistance",
      "Free site assessment & design",
    ],
  },
  {
    name: "Hybrid Home",
    tag: "MOST POPULAR",
    size: "6–10 kWp",
    blurb: "Solar + battery so brownouts don't stop you",
    points: [
      "LiFePO4 battery backup",
      "Runs essential loads during outages",
      "Rapid shutdown device included",
      "Free site assessment & design",
    ],
  },
  {
    name: "Business & Farm",
    tag: null,
    size: "12 kWp and up",
    blurb: "Bigger systems for shops, resorts and farms",
    points: [
      "Custom-engineered for your load",
      "On-grid, hybrid or solar pump setups",
      "Detailed savings projection",
      "Free site assessment & design",
    ],
  },
] as const;

const WARRANTY = [
  ["25 yrs", "Panel performance guarantee"],
  ["12 yrs", "Solar panel product warranty"],
  ["5 yrs", "Inverter & LiFePO4 battery warranty"],
  ["3 yrs", "Free service warranty + yearly cleaning"],
] as const;

export default function WelcomePage() {
  return (
    <div className="min-h-dvh bg-[#0d1a12] text-gray-100">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Image src="/branding/logo.svg" alt="Ensolar Solutions" width={36} height={36} />
          <span className="text-sm font-bold tracking-wide">ENSOLAR SOLUTIONS</span>
        </div>
        <Link
          href="/login"
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-white/10"
        >
          Log in
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PHOTOS.hero}
          alt="Solar panels under a clear sky"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
          <p className="text-xs font-semibold tracking-[0.3em] text-brand-green">
            DUMAGUETE CITY • NEGROS ORIENTAL
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
            Harness the sun.{" "}
            <span className="text-brand-green">Slash your power bill.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-300">
            Solar PV systems designed, installed and serviced by a Registered
            Electrical Engineer — with battery backup options so brownouts
            never slow you down.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#packages"
              className="rounded-lg bg-brand-green px-6 py-3 text-base font-semibold text-white active:bg-brand-green-dark"
            >
              See Packages
            </a>
            <a
              href="#inquire"
              className="rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-gray-100 hover:bg-white/10"
            >
              Inquire Now
            </a>
          </div>
        </div>
      </section>

      {/* Photo strip */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold">Our Work</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            [PHOTOS.work1, "Rooftop solar panel installation"],
            [PHOTOS.work2, "Technician installing solar panels"],
            [PHOTOS.work3, "Solar panels catching the sunlight"],
          ].map(([src, alt]) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={alt}
              loading="lazy"
              className="h-52 w-full rounded-2xl object-cover"
            />
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="border-y border-white/10 bg-white/5">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="mb-6 text-center text-2xl font-bold">What We Do</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(([icon, title, desc]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-[#10241a] p-5">
                <p className="text-2xl">{icon}</p>
                <p className="mt-2 font-semibold">{title}</p>
                <p className="mt-1 text-sm text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="mx-auto max-w-5xl scroll-mt-6 px-4 py-12">
        <h2 className="text-center text-2xl font-bold">Solar Packages</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gray-400">
          Every home is different, so every system is sized to your actual
          consumption. The site assessment and quotation are free.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PACKAGES.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                p.tag
                  ? "border-brand-green bg-[#10241a]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {p.tag && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-green px-3 py-1 text-[10px] font-bold tracking-wider text-white">
                  {p.tag}
                </span>
              )}
              <p className="font-bold">{p.name}</p>
              <p className="mt-1 text-3xl font-extrabold text-brand-green">{p.size}</p>
              <p className="mt-1 text-sm text-gray-400">{p.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-300">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-2">
                    <span className="text-brand-green">✓</span>
                    {pt}
                  </li>
                ))}
              </ul>
              <a
                href="#inquire"
                className={`mt-5 rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
                  p.tag
                    ? "bg-brand-green text-white active:bg-brand-green-dark"
                    : "border border-white/20 text-gray-100 hover:bg-white/10"
                }`}
              >
                Get a Free Quote
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Warranty */}
      <section className="border-y border-white/10 bg-white/5">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="mb-6 text-center text-2xl font-bold">
            Backed by Real Warranties
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {WARRANTY.map(([years, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-[#10241a] p-5 text-center">
                <p className="text-2xl font-extrabold text-brand-green">{years}</p>
                <p className="mt-1 text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-gray-500">
            DTI-registered sole proprietorship • Installations led by a
            Registered Electrical Engineer • Serving Dumaguete City and all of
            Negros Oriental since 2017
          </p>
        </div>
      </section>

      {/* Inquiry */}
      <section id="inquire" className="mx-auto max-w-md scroll-mt-6 px-4 py-12">
        <h2 className="text-center text-2xl font-bold">
          Interested? Let&rsquo;s talk.
        </h2>
        <p className="mb-6 mt-2 text-center text-sm text-gray-400">
          Send your details and we&rsquo;ll contact you within 1 working day to
          schedule your free site assessment.
        </p>
        <InquiryForm campaignId={null} />
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-gray-500">
        <p className="font-semibold text-gray-400">
          Ensolar Solutions Installation Services
        </p>
        <p className="mt-1">19 Espina Road, Taclobo, Dumaguete City, Negros Oriental</p>
        <p className="mt-1">
          (035) 531-6455 • 0961-885-6986 • info.ensolarsolutions@gmail.com
        </p>
        <p className="mt-3 text-gray-600">
          Photos courtesy of Unsplash contributors.
        </p>
      </footer>
    </div>
  );
}
