"use client";

import { useActionState, useState, useTransition } from "react";
import {
  saveCampaign,
  endCampaign,
  deleteCampaign,
  saveAnnouncement,
  toggleAnnouncement,
} from "./actions";
import { formatDate, formatPeso } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

const CHANNELS = ["Facebook", "Flyers", "Referral promo", "Radio", "Tarpaulin", "Other"];

export type CampaignRow = {
  id: string;
  name: string;
  channel: string;
  cost: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
  leads: number;
  won: number;
  share_url: string;
};

export function CampaignForm() {
  const [state, formAction, pending] = useActionState(saveCampaign, null);
  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <p className="font-semibold text-gray-900">New campaign</p>
      <input name="name" placeholder="Campaign name * (e.g. July Solar Promo)" required className={inputClass} />
      <input name="channel" list="channels" placeholder="Channel *" required className={inputClass} />
      <datalist id="channels">
        {CHANNELS.map((c) => <option key={c} value={c} />)}
      </datalist>
      <div className="grid grid-cols-3 gap-2">
        <input name="cost" type="number" min="0" step="any" inputMode="decimal" placeholder="Cost ₱" className={inputClass} />
        <input name="start_date" type="date" className={inputClass} />
        <input name="end_date" type="date" className={inputClass} />
      </div>
      <p className="text-xs text-gray-400">Leave the end date blank while the campaign is running.</p>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Create campaign"}
      </button>
    </form>
  );
}

export function CampaignItem({ campaign }: { campaign: CampaignRow }) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const costPerLead = campaign.leads > 0 ? campaign.cost / campaign.leads : null;
  const costPerWon = campaign.won > 0 ? campaign.cost / campaign.won : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{campaign.name}</p>
          <p className="text-xs text-gray-500">
            {campaign.channel} · {formatDate(campaign.start_date)}
            {campaign.end_date ? ` – ${formatDate(campaign.end_date)}` : " – ongoing"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
            campaign.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
          }`}
        >
          {campaign.active ? "ACTIVE" : "ENDED"}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-base font-extrabold text-gray-900">{campaign.leads}</p>
          <p className="text-[10px] text-gray-500">Leads</p>
        </div>
        <div>
          <p className="text-base font-extrabold text-brand-green-dark">{campaign.won}</p>
          <p className="text-[10px] text-gray-500">Won</p>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">
            {costPerLead === null ? "—" : formatPeso(costPerLead)}
          </p>
          <p className="text-[10px] text-gray-500">Cost/lead</p>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">
            {costPerWon === null ? "—" : formatPeso(costPerWon)}
          </p>
          <p className="text-[10px] text-gray-500">Cost/won</p>
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-gray-400">
        Budget: {formatPeso(campaign.cost)}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={() => {
            navigator.clipboard?.writeText(campaign.share_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-lg border border-brand-green px-3 py-2 text-xs font-semibold text-brand-green-dark"
        >
          {copied ? "✓ Copied!" : "Copy inquiry link"}
        </button>
        {campaign.active && (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await endCampaign(campaign.id);
                if (res.error) setError(res.error);
              })
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600"
          >
            End campaign
          </button>
        )}
        {campaign.leads === 0 && (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteCampaign(campaign.id);
                if (res.error) setError(res.error);
              })
            }
            className="rounded-lg px-3 py-2 text-xs text-gray-400 underline"
          >
            delete
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function AnnouncementsPanel({
  announcements,
}: {
  announcements: { id: string; title: string; body: string | null; active: boolean; created_at: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveAnnouncement, null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-1 font-semibold text-gray-900">Customer portal announcements</p>
      <p className="mb-3 text-xs text-gray-500">
        Active announcements show at the top of every customer's portal —
        great for store-room promos.
      </p>

      <form action={formAction} className="space-y-2 rounded-lg border border-gray-200 p-3">
        <input name="title" placeholder="Title * (e.g. 10% off solar batteries this month!)" required className={inputClass} />
        <textarea name="body" rows={2} placeholder="Details (optional)" className={inputClass} />
        {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
        <button disabled={pending} className="w-full rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Posting…" : "Post announcement"}
        </button>
      </form>

      <ul className="mt-3 divide-y divide-gray-100">
        {announcements.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
            <div className={a.active ? "" : "opacity-50"}>
              <p className="text-sm font-medium text-gray-800">{a.title}</p>
              <p className="text-xs text-gray-500">
                {formatDate(a.created_at)}
                {a.body && ` · ${a.body.slice(0, 60)}${a.body.length > 60 ? "…" : ""}`}
              </p>
            </div>
            <button
              onClick={() =>
                startTransition(async () => {
                  const res = await toggleAnnouncement(a.id, !a.active);
                  if (res.error) setError(res.error);
                })
              }
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                a.active
                  ? "border-gray-300 text-gray-600"
                  : "border-brand-green text-brand-green-dark"
              }`}
            >
              {a.active ? "Hide" : "Show"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
