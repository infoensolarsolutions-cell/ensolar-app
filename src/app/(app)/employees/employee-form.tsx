"use client";

import { useActionState } from "react";
import { saveEmployee } from "./actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

const POSITIONS = [
  "General Manager",
  "Manager",
  "Department Head",
  "Supervisor",
  "Electrical Engineer",
  "Lead Electrician",
  "Electrician",
  "Admin Staff",
  "Driver",
  "Security Guard",
  "Janitor",
  "OJT",
];

export function EmployeeForm({
  employee,
  linkableProfiles,
}: {
  employee?: {
    id: string;
    name: string;
    position: string | null;
    rate_type: "daily" | "monthly";
    rate: number;
    sss_no: string | null;
    philhealth_no: string | null;
    pagibig_no: string | null;
    hired_at: string | null;
    profile_id: string | null;
    active: boolean;
  };
  linkableProfiles: { id: string; name: string; role: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveEmployee, null);

  return (
    <form action={formAction} className="space-y-3 p-4">
      {employee && <input type="hidden" name="employee_id" value={employee.id} />}

      <div>
        <label className="text-xs text-gray-500">Full name *</label>
        <input name="name" required defaultValue={employee?.name ?? ""} className={inputClass} />
      </div>
      <div>
        <label className="text-xs text-gray-500">Position</label>
        <input
          name="position"
          list="positions"
          defaultValue={employee?.position ?? ""}
          className={inputClass}
        />
        <datalist id="positions">
          {POSITIONS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Rate type</label>
          <select name="rate_type" defaultValue={employee?.rate_type ?? "daily"} className={inputClass}>
            <option value="daily">Daily rate</option>
            <option value="monthly">Monthly rate</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Rate ₱</label>
          <input name="rate" type="number" min="0" step="any" inputMode="decimal" defaultValue={employee?.rate ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500">SSS no.</label>
          <input name="sss_no" defaultValue={employee?.sss_no ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500">PhilHealth</label>
          <input name="philhealth_no" defaultValue={employee?.philhealth_no ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Pag-IBIG</label>
          <input name="pagibig_no" defaultValue={employee?.pagibig_no ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Date hired</label>
          <input name="hired_at" type="date" defaultValue={employee?.hired_at ?? ""} className={inputClass} />
        </div>
        {employee && (
          <div>
            <label className="text-xs text-gray-500">Status</label>
            <select name="active" defaultValue={String(employee.active)} className={inputClass}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-500">
          Kiosk PIN (4–6 digits, for the office clock-in terminal)
        </label>
        <input
          name="pin"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          placeholder={employee ? "Leave blank to keep current PIN" : "e.g. 4821"}
          className={inputClass}
        />
      </div>

      <div>
        <label className="text-xs text-gray-500">
          App login (links their account for clock in/out)
        </label>
        <select name="profile_id" defaultValue={employee?.profile_id ?? ""} className={inputClass}>
          <option value="">No app login</option>
          {linkableProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.role})
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}

      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : employee ? "Save changes" : "Add employee"}
      </button>
    </form>
  );
}
