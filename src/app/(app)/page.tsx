import { TopBar } from "@/components/top-bar";

export default function DashboardPage() {
  return (
    <>
      <TopBar title="Ensolar" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-gray-900">Welcome</h2>
          <p className="mt-1 text-sm text-gray-600">
            Ensolar Business Management System — Module A (CRM + Sales) is
            under construction. The dashboard will show overdue follow-ups and
            this month&apos;s leads here.
          </p>
        </div>
      </div>
    </>
  );
}
