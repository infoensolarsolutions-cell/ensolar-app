export const PAYABLE_CATEGORIES = {
  loan: "🏦 Company loans",
  supplier: "📦 Supplier payables",
  government: "🏛 Government (BIR · SSS · PhilHealth · Pag-IBIG)",
  utility: "💡 Utilities & subscriptions",
  rent: "🏠 Rent & lease",
  owner: "👤 Owner's obligations",
  other: "📌 Other obligations",
} as const;

export type PayableCategory = keyof typeof PAYABLE_CATEGORIES;
