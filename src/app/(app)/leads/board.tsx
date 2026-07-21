"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { moveLead } from "./actions";
import {
  LEAD_STATUSES,
  LOST_REASONS,
  SERVICE_TYPES,
  type LeadStatus,
  type ServiceType,
} from "@/lib/crm";
import { formatDate } from "@/lib/format";

export type BoardLead = {
  id: string;
  status: LeadStatus;
  service_type: ServiceType;
  next_followup_at: string | null;
  customer_name: string;
  assignee_name: string | null;
  overdue: boolean;
};

const STATUS_KEYS = Object.keys(LEAD_STATUSES) as LeadStatus[];

function LeadCard({ lead }: { lead: BoardLead }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging) router.push(`/leads/${lead.id}`);
      }}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
      className={`cursor-pointer rounded-lg border bg-white p-3 text-left shadow-sm ${
        isDragging ? "z-50 opacity-80 ring-2 ring-brand-green" : ""
      } ${lead.overdue ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"}`}
    >
      <p className="text-sm font-semibold text-gray-900">{lead.customer_name}</p>
      <p className="text-xs text-gray-600">{SERVICE_TYPES[lead.service_type]}</p>
      <div className="mt-1.5 flex items-center justify-between gap-1 text-xs">
        <span className="truncate text-gray-500">
          {lead.assignee_name ?? "Unassigned"}
        </span>
        {lead.next_followup_at && (
          <span
            className={
              lead.overdue ? "shrink-0 font-semibold text-red-600" : "shrink-0 text-gray-500"
            }
          >
            {formatDate(lead.next_followup_at)}
          </span>
        )}
      </div>
    </div>
  );
}

function Column({
  status,
  leads,
}: {
  status: LeadStatus;
  leads: BoardLead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const overdueCount = leads.filter((l) => l.overdue).length;

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[280px] shrink-0 snap-center flex-col rounded-xl border p-2 lg:w-auto ${
        isOver ? "border-brand-green bg-brand-green/5" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-sm font-bold text-gray-800">{LEAD_STATUSES[status]}</p>
        <span className="flex items-center gap-1.5">
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {overdueCount} overdue
            </span>
          )}
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {leads.length}
          </span>
        </span>
      </div>
      <div className="flex min-h-24 flex-col gap-2">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ leads }: { leads: BoardLead[] }) {
  const [items, setItems] = useState(leads);
  const [error, setError] = useState<string | null>(null);
  const [lostPrompt, setLostPrompt] = useState<{ leadId: string } | null>(null);
  const [, startTransition] = useTransition();

  // Distance activation keeps taps working as clicks on touch screens.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  function applyMove(leadId: string, status: LeadStatus, lostReason?: string) {
    const prev = items;
    setItems((cur) =>
      cur.map((l) => (l.id === leadId ? { ...l, status } : l)),
    );
    setError(null);
    startTransition(async () => {
      const res = await moveLead(leadId, status, lostReason);
      if (res.error) {
        setItems(prev);
        setError(res.error);
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const leadId = String(event.active.id);
    const target = event.over?.id as LeadStatus | undefined;
    if (!target) return;
    const lead = items.find((l) => l.id === leadId);
    if (!lead || lead.status === target) return;

    if (target === "lost") {
      setLostPrompt({ leadId });
      return;
    }
    applyMove(leadId, target);
  }

  return (
    <>
      {error && (
        <p className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 lg:grid lg:grid-cols-4 lg:snap-none lg:overflow-visible">
          {STATUS_KEYS.map((status) => (
            <Column
              key={status}
              status={status}
              leads={items.filter((l) => l.status === status)}
            />
          ))}
        </div>
      </DndContext>

      {lostPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <p className="font-bold text-gray-900">Why was this lead lost?</p>
            <div className="mt-3 flex flex-col gap-2">
              {Object.entries(LOST_REASONS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    applyMove(lostPrompt.leadId, "lost", value);
                    setLostPrompt(null);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-800 active:bg-gray-100"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setLostPrompt(null)}
                className="mt-1 rounded-lg px-4 py-3 text-sm font-medium text-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
