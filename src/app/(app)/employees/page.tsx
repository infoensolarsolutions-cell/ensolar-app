import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso, todayManila } from "@/lib/format";

export const metadata: Metadata = { title: "Employees" };

type EmployeeRow = {
  id: string;
  name: string;
  position: string | null;
  rate_type: "daily" | "monthly";
  rate: number;
  active: boolean;
  profile_id: string | null;
  sss_no: string | null;
  philhealth_no: string | null;
  pagibig_no: string | null;
  hired_at: string | null;
  resigned_at: string | null;
  address: string | null;
  birth_date: string | null;
  gender: string | null;
  contact_no: string | null;
  email: string | null;
  emergency_name: string | null;
  emergency_relationship: string | null;
  emergency_contact_no: string | null;
  emergency_address: string | null;
};

function ageFrom(birthDate: string | null, today: string): string {
  if (!birthDate) return "—";
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age >= 0 && age < 130 ? String(age) : "—";
}

export default async function EmployeesPage() {
  await requireRole("owner");
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from("employees")
    .select(
      "id, name, position, rate_type, rate, active, profile_id, sss_no, philhealth_no, pagibig_no, hired_at, resigned_at, address, birth_date, gender, contact_no, email, emergency_name, emergency_relationship, emergency_contact_no, emergency_address",
    )
    .order("name")
    .overrideTypes<EmployeeRow[]>();

  const today = todayManila();

  return (
    <>
      <TopBar title="Employees" backHref="/more" />
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/employees/new"
            className="rounded-xl bg-brand-green px-6 py-3.5 text-center text-base font-semibold text-white max-lg:flex-1"
          >
            + Add Employee
          </Link>
          <a
            href="/api/export/employees"
            className="rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-semibold text-gray-700 active:bg-gray-50"
          >
            📥 Export CSV
          </a>
        </div>
        {!employees?.length && (
          <p className="pt-6 text-center text-sm text-gray-500">No employees yet.</p>
        )}

        {/* Phones: tappable cards */}
        <div className="space-y-3 lg:hidden">
          {employees?.map((e) => (
            <Link
              key={e.id}
              href={`/employees/${e.id}`}
              className={`block rounded-xl border border-gray-200 bg-white p-4 ${e.active ? "" : "opacity-50"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{e.name}</p>
                  <p className="text-xs text-gray-500">
                    {e.position ?? "—"}
                    {e.contact_no && ` · ${e.contact_no}`}
                    {!e.active && " · inactive"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-gray-800">
                  {formatPeso(e.rate)}
                  <span className="text-xs font-medium text-gray-500">
                    /{e.rate_type === "daily" ? "day" : "mo"}
                  </span>
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop: personnel register table */}
        {!!employees?.length && (
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white lg:block">
            <table className="w-full min-w-[1500px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-3 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Address</th>
                  <th className="px-3 py-3 text-center font-semibold">Age</th>
                  <th className="px-3 py-3 font-semibold">Date of Birth</th>
                  <th className="px-3 py-3 font-semibold">Gender</th>
                  <th className="px-3 py-3 font-semibold">Contact No.</th>
                  <th className="px-3 py-3 font-semibold">Email Address</th>
                  <th className="px-3 py-3 font-semibold">
                    Emergency Contact
                    <span className="block text-[10px] font-normal normal-case">
                      Name · Relationship · Contact No. · Address
                    </span>
                  </th>
                  <th className="px-3 py-3 font-semibold">SSS</th>
                  <th className="px-3 py-3 font-semibold">PhilHealth</th>
                  <th className="px-3 py-3 font-semibold">Pag-IBIG</th>
                  <th className="px-3 py-3 font-semibold">Date Started</th>
                  <th className="px-3 py-3 font-semibold">Date Resigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((e) => (
                  <tr key={e.id} className={`align-top hover:bg-gray-50 ${e.active ? "" : "opacity-50"}`}>
                    <td className="px-3 py-2.5">
                      <Link href={`/employees/${e.id}`} className="font-semibold text-gray-900 hover:underline">
                        {e.name}
                      </Link>
                      <p className="text-xs text-gray-500">{e.position ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{e.address ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center font-medium text-gray-800">
                      {ageFrom(e.birth_date, today)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">
                      {e.birth_date ? formatDate(e.birth_date) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{e.gender ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">
                      {e.contact_no ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{e.email ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {e.emergency_name ? (
                        <>
                          <span className="font-medium text-gray-800">{e.emergency_name}</span>
                          {e.emergency_relationship && ` · ${e.emergency_relationship}`}
                          {e.emergency_contact_no && ` · ${e.emergency_contact_no}`}
                          {e.emergency_address && (
                            <span className="block text-xs text-gray-500">
                              {e.emergency_address}
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{e.sss_no ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{e.philhealth_no ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{e.pagibig_no ?? "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">
                      {e.hired_at ? formatDate(e.hired_at) : "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">
                      {e.resigned_at ? formatDate(e.resigned_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-400 lg:block">
          Tap a name to open the full record (rates, government numbers, kiosk
          PIN, attendance). Fill in the personal details via the employee&rsquo;s
          Edit form.
        </p>
      </div>
    </>
  );
}
