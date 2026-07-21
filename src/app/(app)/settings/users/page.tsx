import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole, ROLE_LABELS, type UserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AddUserForm } from "./add-user-form";
import { UserRow } from "./user-row";

export const metadata: Metadata = { title: "Users & Roles" };

const ROLE_ORDER: UserRole[] = ["owner", "office_staff", "technician", "customer"];

export default async function UsersPage() {
  const me = await requireRole("owner");
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, role, active")
    .order("name");

  // Emails live in auth.users; the service-role client can list them.
  const emails = new Map<string, string>();
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) emails.set(u.id, u.email ?? "");
  } catch {
    // Without SUPABASE_SERVICE_ROLE_KEY the page still works, minus emails.
  }

  const users = (profiles ?? [])
    .map((p) => ({ ...p, email: emails.get(p.id) ?? "" }))
    .sort(
      (a, b) =>
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
        a.name.localeCompare(b.name),
    );

  return (
    <>
      <TopBar title="Users & Roles" backHref="/more" />
      <div className="space-y-4 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-4 pb-2 pt-3 font-semibold text-gray-900">
            ➕ Add a new user
          </p>
          <AddUserForm />
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-4 pb-2 pt-3 font-semibold text-gray-900">
            👥 All users ({users.length})
          </p>
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <UserRow key={u.id} user={u} isSelf={u.id === me.id} />
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-gray-100 px-4 py-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-800">What each role can do:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li><b>{ROLE_LABELS.owner}</b> — everything, including payroll, reports and this page.</li>
            <li><b>{ROLE_LABELS.office_staff}</b> — CRM, quotations, projects, payments, POS, inventory.</li>
            <li><b>{ROLE_LABELS.technician}</b> — assigned projects only, photo uploads, clock in/out.</li>
            <li><b>{ROLE_LABELS.customer}</b> — their own customer portal only.</li>
          </ul>
          <p className="mt-1">
            To pay someone through payroll, also add them under More → Employees
            and link their app login there.
          </p>
        </div>
      </div>
    </>
  );
}
