// Shared CRM vocabulary — labels for enum values (Spec §5.1).

export const SERVICE_TYPES = {
  solar: "Solar Installation",
  electrical: "Electrical Works",
  cctv: "CCTV",
  fdas: "FDAS",
  solar_pump: "Solar Pump",
  product_purchase: "Product Purchase",
} as const;

export type ServiceType = keyof typeof SERVICE_TYPES;

export const LEAD_SOURCES = {
  walk_in: "Walk-in",
  phone: "Phone",
  facebook: "Facebook",
  internet_search: "Internet Search",
  referral: "Referral",
} as const;

export type LeadSource = keyof typeof LEAD_SOURCES;

export const LEAD_STATUSES = {
  new_inquiry: "New Inquiry",
  contacted: "Contacted",
  site_visit_scheduled: "Site Visit Scheduled",
  quotation_sent: "Quotation Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
} as const;

export type LeadStatus = keyof typeof LEAD_STATUSES;

export const LOST_REASONS = {
  price: "Price",
  competitor: "Competitor",
  no_budget: "No budget",
  no_response: "No response",
  other: "Other",
} as const;

export type LostReason = keyof typeof LOST_REASONS;

// Tomorrow in Asia/Manila as YYYY-MM-DD — default follow-up for new leads.
export function tomorrowManila(): string {
  const now = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
