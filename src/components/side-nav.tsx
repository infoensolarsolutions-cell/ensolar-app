"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/auth-shared";

type Item = { href: string; label: string };
type Group = { title: string; items: Item[] };

const GROUPS: Record<"owner" | "office_staff" | "technician", Group[]> = {
  owner: [
    {
      title: "Sales",
      items: [
        { href: "/", label: "🏠 Dashboard" },
        { href: "/leads", label: "🧲 Leads" },
        { href: "/quotations", label: "📄 Quotations" },
        { href: "/settings/quotation-templates", label: "📋 Quotation Templates" },
        { href: "/projects", label: "🏗️ Projects" },
        { href: "/campaigns", label: "📣 Marketing" },
      ],
    },
    {
      title: "Store",
      items: [
        { href: "/products", label: "📦 Products & Stock" },
        { href: "/pos", label: "🛒 POS" },
      ],
    },
    {
      title: "Team",
      items: [
        { href: "/attendance", label: "🕐 Attendance" },
        { href: "/kiosk", label: "🖥️ Attendance Kiosk" },
        { href: "/employees", label: "👥 Employees" },
        { href: "/payroll", label: "💵 Payroll" },
      ],
    },
    {
      title: "Money",
      items: [
        { href: "/expenses", label: "🧾 Expenses" },
        { href: "/reports/pnl", label: "📊 Profit & Loss" },
        { href: "/reports/receivables", label: "⏰ Receivables" },
      ],
    },
    {
      title: "Settings",
      items: [
        { href: "/settings/users", label: "👤 Users & Roles" },
        { href: "/settings/contract-template", label: "📜 Contract Template" },
        { href: "/settings/landing-photos", label: "🖼️ Landing Photos" },
        { href: "/payroll/settings", label: "⚙️ Payroll Settings" },
        { href: "/more", label: "☰ More" },
      ],
    },
  ],
  office_staff: [
    {
      title: "Sales",
      items: [
        { href: "/", label: "🏠 Dashboard" },
        { href: "/leads", label: "🧲 Leads" },
        { href: "/quotations", label: "📄 Quotations" },
        { href: "/settings/quotation-templates", label: "📋 Quotation Templates" },
        { href: "/projects", label: "🏗️ Projects" },
        { href: "/campaigns", label: "📣 Marketing" },
      ],
    },
    {
      title: "Store",
      items: [
        { href: "/products", label: "📦 Products & Stock" },
        { href: "/pos", label: "🛒 POS" },
      ],
    },
    {
      title: "Me",
      items: [
        { href: "/attendance", label: "🕐 My Attendance" },
        { href: "/kiosk", label: "🖥️ Attendance Kiosk" },
        { href: "/more", label: "☰ More" },
      ],
    },
  ],
  technician: [
    {
      title: "Work",
      items: [
        { href: "/", label: "🏠 Dashboard" },
        { href: "/projects", label: "🏗️ My Projects" },
        { href: "/attendance", label: "🕐 My Attendance" },
        { href: "/more", label: "☰ More" },
      ],
    },
  ],
};

export function SideNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  if (role === "customer") return null;
  const groups = GROUPS[role];

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white lg:flex">
      <div className="flex items-center gap-2 px-4 py-4">
        <Image src="/branding/logo.svg" alt="Ensolar" width={32} height={32} />
        <div>
          <p className="text-sm font-bold leading-tight text-gray-900">Ensolar Solutions</p>
          <p className="text-[10px] italic leading-tight text-brand-green">LINKING THE SUN</p>
        </div>
      </div>
      <nav className="flex-1 space-y-4 px-2 pb-6">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {g.title}
            </p>
            {g.items.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-brand-green/10 text-brand-green-dark"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
