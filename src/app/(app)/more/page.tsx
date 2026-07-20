import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { getProfile, ROLE_LABELS } from "@/lib/auth";
import { signOut } from "@/app/(public)/login/actions";

export const metadata: Metadata = { title: "More" };

export default async function MorePage() {
  const profile = (await getProfile())!;

  return (
    <>
      <TopBar title="More" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-semibold text-gray-900">
            {profile.name || profile.email}
          </p>
          <p className="text-sm text-gray-600">{profile.email}</p>
          <span className="mt-2 inline-block rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green-dark">
            {ROLE_LABELS[profile.role]}
          </span>
        </div>
        {["owner", "office_staff"].includes(profile.role) && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <Link href="/products" className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
              <span className="font-medium text-gray-800">📦 Products & Stock</span>
              <span className="text-gray-400">›</span>
            </Link>
            <Link href="/pos" className="flex items-center justify-between px-4 py-3.5">
              <span className="font-medium text-gray-800">🛒 POS (walk-in sales)</span>
              <span className="text-gray-400">›</span>
            </Link>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <Link href="/attendance" className="flex items-center justify-between px-4 py-3.5">
            <span className="font-medium text-gray-800">🕐 My Attendance</span>
            <span className="text-gray-400">›</span>
          </Link>
          {profile.role === "owner" && (
            <>
              <Link href="/employees" className="flex items-center justify-between border-t border-gray-100 px-4 py-3.5">
                <span className="font-medium text-gray-800">👥 Employees</span>
                <span className="text-gray-400">›</span>
              </Link>
              <Link href="/payroll" className="flex items-center justify-between border-t border-gray-100 px-4 py-3.5">
                <span className="font-medium text-gray-800">💵 Payroll (Weekly)</span>
                <span className="text-gray-400">›</span>
              </Link>
              <Link href="/payroll/settings" className="flex items-center justify-between border-t border-gray-100 px-4 py-3.5">
                <span className="font-medium text-gray-800">⚙️ Payroll Settings</span>
                <span className="text-gray-400">›</span>
              </Link>
            </>
          )}
        </div>

        {profile.role === "owner" && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <Link href="/expenses" className="flex items-center justify-between px-4 py-3.5">
              <span className="font-medium text-gray-800">🧾 Expenses</span>
              <span className="text-gray-400">›</span>
            </Link>
            <Link href="/reports/pnl" className="flex items-center justify-between border-t border-gray-100 px-4 py-3.5">
              <span className="font-medium text-gray-800">📊 Profit & Loss</span>
              <span className="text-gray-400">›</span>
            </Link>
            <Link href="/reports/receivables" className="flex items-center justify-between border-t border-gray-100 px-4 py-3.5">
              <span className="font-medium text-gray-800">⏰ Receivables Aging</span>
              <span className="text-gray-400">›</span>
            </Link>
          </div>
        )}

        {["owner", "office_staff"].includes(profile.role) && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">📥 Export to Excel (CSV)</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["customers", "Customers"],
                ["projects", "Projects"],
                ["payments", "Payments"],
                ["inventory", "Inventory"],
                ["sales", "POS Sales"],
              ].map(([entity, label]) => (
                <a
                  key={entity}
                  href={`/api/export/${entity}`}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 active:bg-gray-50"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        )}
        <form action={signOut}>
          <button className="w-full rounded-xl border border-red-200 bg-white px-4 py-3.5 text-base font-semibold text-red-600 active:bg-red-50">
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
