"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { addEquipment, deleteEquipment, updateEquipment } from "./actions";
import { formatDate } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export const EQUIPMENT_TYPES: Record<string, string> = {
  inverter: "⚡ Inverter",
  battery: "🔋 Battery",
  solar_panel: "☀️ Solar panel",
  other: "📌 Other",
};

export type EquipmentRow = {
  id: string;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  serial_no: string;
  supplier: string | null;
  supplier_contact: string | null;
  purchase_date: string | null;
  project_id: string | null;
  issued_date: string | null;
  notes: string | null;
  project_no: string | null;
  customer_name: string | null;
};

export type ProjectOption = { id: string; label: string };

export function EquipmentView({
  rows,
  projects,
  isStaff,
  isOwner,
}: {
  rows: EquipmentRow[];
  projects: ProjectOption[];
  isStaff: boolean;
  isOwner: boolean;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (type === "stock" && r.project_id) return false;
      if (type !== "all" && type !== "stock" && r.equipment_type !== type) return false;
      if (!q) return true;
      return [r.serial_no, r.brand ?? "", r.model ?? "", r.supplier ?? "", r.project_no ?? "", r.customer_name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, type]);

  const inStock = rows.filter((r) => !r.project_id).length;

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Registered units</p>
          <p className="text-lg font-extrabold text-gray-900">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">In stock</p>
          <p className="text-lg font-extrabold text-gray-900">{inStock}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Issued to projects</p>
          <p className="text-lg font-extrabold text-brand-green-dark">{rows.length - inStock}</p>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Search serial no., brand, supplier, project…"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
      />

      <div className="flex flex-wrap gap-2">
        {[
          ["all", `All (${rows.length})`],
          ["stock", `📦 In stock (${inStock})`],
          ...Object.entries(EQUIPMENT_TYPES).map(([k, l]) => [
            k,
            `${l} (${rows.filter((r) => r.equipment_type === k).length})`,
          ]),
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setType(type === k ? "all" : k)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              type === k ? "bg-brand-green text-white" : "border border-gray-300 text-gray-600"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {isStaff && (
        !showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full rounded-lg bg-brand-green px-4 py-3 text-sm font-semibold text-white active:bg-brand-green-dark"
          >
            + Register equipment unit (serial no.)
          </button>
        ) : (
          <UnitForm projects={projects} onDone={() => setShowForm(false)} />
        )
      )}

      {!rows.length && (
        <p className="pt-6 text-center text-sm text-gray-500">
          No units registered yet. Register each inverter and battery with its
          serial number and supplier — when a unit needs warranty support,
          everything you need is one search away.
        </p>
      )}
      {rows.length > 0 && !filtered.length && (
        <p className="pt-6 text-center text-sm text-gray-500">No units match.</p>
      )}

      {filtered.map((r) => (
        <UnitCard key={r.id} unit={r} projects={projects} isStaff={isStaff} isOwner={isOwner} />
      ))}
    </div>
  );
}

function UnitCard({
  unit,
  projects,
  isStaff,
  isOwner,
}: {
  unit: EquipmentRow;
  projects: ProjectOption[];
  isStaff: boolean;
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return <UnitForm unit={unit} projects={projects} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-green-dark">
            {EQUIPMENT_TYPES[unit.equipment_type] ?? unit.equipment_type}
            {unit.brand && ` · ${unit.brand}`}
            {unit.model && ` ${unit.model}`}
          </p>
          <p className="font-mono text-sm font-bold text-gray-900">{unit.serial_no}</p>
          {unit.supplier && (
            <p className="text-xs text-gray-600">
              🏪 {unit.supplier}
              {unit.supplier_contact && (
                <span className="text-gray-500"> · {unit.supplier_contact}</span>
              )}
            </p>
          )}
          {unit.purchase_date && (
            <p className="text-[11px] text-gray-400">Purchased {formatDate(unit.purchase_date)}</p>
          )}
          {unit.notes && <p className="mt-0.5 text-xs text-gray-500">{unit.notes}</p>}
        </div>
        <div className="shrink-0 text-right">
          {unit.project_id ? (
            <>
              <Link
                href={`/projects/${unit.project_id}`}
                className="inline-block rounded-full bg-brand-green/10 px-2 py-0.5 text-[11px] font-bold text-brand-green-dark underline"
              >
                {unit.project_no ?? "Project"}
              </Link>
              {unit.customer_name && (
                <p className="text-[11px] text-gray-500">{unit.customer_name}</p>
              )}
              {unit.issued_date && (
                <p className="text-[11px] text-gray-400">issued {formatDate(unit.issued_date)}</p>
              )}
            </>
          ) : (
            <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
              📦 In stock
            </span>
          )}
          {isStaff && (
            <p className="mt-1 flex justify-end gap-2 text-xs">
              <button onClick={() => setEditing(true)} className="text-brand-green-dark underline">
                edit
              </button>
              {isOwner && (
                <button
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Delete unit ${unit.serial_no} from the registry?`)) return;
                    setError(null);
                    startTransition(async () => {
                      const res = await deleteEquipment(unit.id);
                      if (res.error) setError(res.error);
                    });
                  }}
                  className="text-red-600 underline disabled:opacity-50"
                >
                  delete
                </button>
              )}
            </p>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

function UnitForm({
  unit,
  projects,
  onDone,
}: {
  unit?: EquipmentRow;
  projects: ProjectOption[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    unit ? updateEquipment : addEquipment,
    null,
  );

  useEffect(() => {
    if (state?.saved && !state.error) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      {unit && <input type="hidden" name="id" value={unit.id} />}
      <div className="grid grid-cols-2 gap-2">
        <select name="equipment_type" defaultValue={unit?.equipment_type ?? "inverter"} className={inputClass}>
          {Object.entries(EQUIPMENT_TYPES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input name="brand" defaultValue={unit?.brand ?? ""} placeholder="Brand (e.g. Deye)" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="model" defaultValue={unit?.model ?? ""} placeholder="Model (e.g. SUN-8K-SG01LP1)" className={inputClass} />
        <input name="serial_no" defaultValue={unit?.serial_no ?? ""} required placeholder="Serial number" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="supplier" defaultValue={unit?.supplier ?? ""} placeholder="Supplier / distributor" className={inputClass} />
        <input name="supplier_contact" defaultValue={unit?.supplier_contact ?? ""} placeholder="Support contact (phone / email)" className={inputClass} />
      </div>
      <div>
        <label className="text-xs text-gray-500">Purchase date (optional)</label>
        <input name="purchase_date" type="date" defaultValue={unit?.purchase_date ?? ""} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 p-2">
        <div>
          <label className="text-xs text-gray-500">Issued to project (optional)</label>
          <select name="project_id" defaultValue={unit?.project_id ?? ""} className={inputClass}>
            <option value="">— In stock (not issued) —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Issued date</label>
          <input name="issued_date" type="date" defaultValue={unit?.issued_date ?? ""} className={inputClass} />
        </div>
      </div>
      <input name="notes" defaultValue={unit?.notes ?? ""} placeholder="Notes (optional, e.g. warranty until)" className={inputClass} />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{state.error}</p>
      )}
      <div className="flex gap-2">
        <button disabled={pending} className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : unit ? "Save changes" : "Register unit"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
