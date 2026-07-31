import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  LEAD_STATUSES,
  SERVICE_TYPES,
  type LeadStatus,
  type LostReason,
  type ServiceType,
} from "@/lib/crm";
import { formatDate } from "@/lib/format";
import { LeadEditForm } from "./edit-form";
import { ContactEditForm } from "./contact-edit-form";
import { DeleteLeadButton } from "./delete-lead-button";

export const metadata: Metadata = { title: "Lead" };

type LeadDetail = {
  id: string;
  status: LeadStatus;
  service_type: ServiceType;
  next_followup_at: string | null;
  lost_reason: LostReason | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  customer_id: string;
  customers: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    barangay: string | null;
    referred_by: string | null;
  } | null;
};

type EventRow = {
  id: string;
  event: string;
  detail: Record<string, string> | null;
  created_at: string;
  profiles: { name: string } | null;
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, status, service_type, next_followup_at, lost_reason, notes, assigned_to, created_at, customer_id, customers (name, phone, email, address, barangay, referred_by)",
    )
    .eq("id", id)
    .single()
    .overrideTypes<LeadDetail>();

  if (!lead) notFound();

  const [{ data: staff }, { data: events }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, role")
      .in("role", ["owner", "office_staff", "technician"])
      .eq("active", true)
      .order("name"),
    supabase
      .from("lead_events")
      .select("id, event, detail, created_at, profiles:user_id (name)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(30)
      .overrideTypes<EventRow[]>(),
  ]);

  const c = lead.customers;

  // The public inquiry form stores the visitor's message in the lead notes.
  const inquiryMessage = lead.notes?.startsWith("From public inquiry form:")
    ? lead.notes.replace("From public inquiry form:", "").trim() || null
    : null;
  const firstName = (c?.name ?? "").trim().split(/\s+/)[0] ?? "";
  const replyText =
    `Good day ${firstName}! This is Ensolar Solutions Installation Services regarding your ` +
    `${SERVICE_TYPES[lead.service_type]} inquiry. `;
  // `?&body=` works in both iOS and Android SMS apps.
  const smsHref = c?.phone
    ? `sms:${c.phone}?&body=${encodeURIComponent(replyText)}`
    : null;
  const mailHref = c?.email
    ? `mailto:${c.email}?subject=${encodeURIComponent("Re: Your solar inquiry — Ensolar Solutions")}&body=${encodeURIComponent(
        replyText + (inquiryMessage ? `\n\nYour inquiry:\n"${inquiryMessage}"` : ""),
      )}`
    : null;

  return (
    <>
      <TopBar title="Lead Details" backHref="/leads" />
      <div className="space-y-4 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        <Link href="/leads" className="text-sm font-medium text-brand-green-dark lg:col-span-full">
          ← Back to pipeline
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-lg font-bold text-gray-900">{c?.name}</p>
          <p className="text-sm text-gray-600">{SERVICE_TYPES[lead.service_type]}</p>
          <div className="mt-2 space-y-1 text-sm text-gray-700">
            {c?.phone && (
              <p>
                📞{" "}
                <a href={`tel:${c.phone}`} className="font-medium text-brand-green-dark underline">
                  {c.phone}
                </a>
              </p>
            )}
            {c?.email && <p>✉️ {c.email}</p>}
            {(c?.address || c?.barangay) && (
              <p>📍 {[c.address, c.barangay].filter(Boolean).join(", ")}</p>
            )}
            {c?.referred_by && <p>Referred by: {c.referred_by}</p>}
            <p className="text-xs text-gray-400">
              Created {formatDate(lead.created_at)}
            </p>
          </div>
          {c && (
            <ContactEditForm
              leadId={lead.id}
              customerId={lead.customer_id}
              contact={c}
            />
          )}
        </div>

        {(inquiryMessage || c?.phone || c?.email) && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">Inquiry & reply</p>
            {inquiryMessage ? (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-gray-800">
                💬 &ldquo;{inquiryMessage}&rdquo;
              </p>
            ) : (
              <p className="mb-3 text-xs text-gray-400">
                No written message on this inquiry.
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {c?.phone && (
                <a
                  href={`tel:${c.phone}`}
                  className="rounded-lg bg-brand-green px-3 py-2.5 text-center text-sm font-semibold text-white active:bg-brand-green-dark"
                >
                  📞 Call
                </a>
              )}
              {smsHref && (
                <a
                  href={smsHref}
                  className="rounded-lg border border-brand-green px-3 py-2.5 text-center text-sm font-semibold text-brand-green-dark active:bg-brand-green/5"
                >
                  💬 SMS
                </a>
              )}
              {mailHref ? (
                <a
                  href={mailHref}
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-center text-sm font-semibold text-gray-700 active:bg-gray-50"
                >
                  ✉️ Email
                </a>
              ) : (
                <span className="rounded-lg border border-gray-200 px-3 py-2.5 text-center text-sm text-gray-300">
                  ✉️ No email
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Opens your phone&rsquo;s call, SMS, or email app with a ready-made
              greeting — edit the message before sending.
            </p>
          </div>
        )}

        <Link
          href={`/quotations/new?lead=${lead.id}`}
          className="block w-full rounded-xl bg-brand-green px-4 py-3.5 text-center text-base font-semibold text-white active:bg-brand-green-dark"
        >
          Create Quotation
        </Link>

        <LeadEditForm
          lead={{
            id: lead.id,
            status: lead.status,
            lost_reason: lead.lost_reason,
            assigned_to: lead.assigned_to,
            next_followup_at: lead.next_followup_at,
            notes: lead.notes,
          }}
          staff={staff ?? []}
        />

        {profile.role === "owner" && lead.status === "new_inquiry" && (
          <DeleteLeadButton leadId={lead.id} />
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 font-semibold text-gray-900">Activity</p>
          {!events?.length && (
            <p className="text-sm text-gray-500">No activity yet.</p>
          )}
          <ul className="space-y-2">
            {events?.map((ev) => (
              <li key={ev.id} className="text-sm text-gray-700">
                <span className="text-xs text-gray-400">
                  {formatDate(ev.created_at)}
                </span>{" "}
                {describeEvent(ev)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function describeEvent(ev: EventRow): string {
  const who = ev.profiles?.name ?? "Public form";
  if (ev.event === "created") return `${who} created this lead`;
  if (ev.event === "status_changed") {
    const from = ev.detail?.from as LeadStatus | undefined;
    const to = ev.detail?.to as LeadStatus | undefined;
    const reason = ev.detail?.lost_reason;
    return `${who} moved ${from ? LEAD_STATUSES[from] : "?"} → ${
      to ? LEAD_STATUSES[to] : "?"
    }${reason ? ` (${reason})` : ""}`;
  }
  return `${who}: ${ev.event}`;
}
