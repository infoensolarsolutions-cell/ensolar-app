const STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-800",
};

const LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

// "sent" past its validity date displays as Expired (Spec §5.1).
export function effectiveStatus(
  status: string,
  validUntil: string | null,
  today: string,
): string {
  if (status === "sent" && validUntil && validUntil < today) return "expired";
  return status;
}

export function StatusBadge({
  status,
  validUntil,
  today,
}: {
  status: string;
  validUntil: string | null;
  today: string;
}) {
  const s = effectiveStatus(status, validUntil, today);
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STYLES[s] ?? STYLES.draft}`}
    >
      {LABELS[s] ?? s}
    </span>
  );
}
