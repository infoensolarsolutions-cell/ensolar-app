// Shared formatting helpers — PHP currency, Asia/Manila dates (DD MMM YYYY).

export const TIMEZONE = "Asia/Manila";

export function formatPeso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-PH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(d);
}

// Today's date in Asia/Manila as YYYY-MM-DD, for comparing against DATE columns.
export function todayManila(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// "₱12,345.60" → "Twelve Thousand Three Hundred Forty-Five Pesos and 60/100 Only"
// for acknowledgment receipts (standard PH practice).
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function threeDigits(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    const ten = TENS[Math.floor(n / 10)];
    const one = n % 10 ? `-${ONES[n % 10]}` : "";
    parts.push(`${ten}${one}`);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

export function pesoInWords(amount: number): string {
  const whole = Math.floor(amount);
  const centavos = Math.round((amount - whole) * 100);
  if (whole === 0) return `Zero Pesos and ${String(centavos).padStart(2, "0")}/100 Only`;

  const groups: string[] = [];
  const units = ["", " Thousand", " Million", " Billion"];
  let n = whole;
  let i = 0;
  while (n > 0 && i < units.length) {
    const chunk = n % 1000;
    if (chunk) groups.unshift(`${threeDigits(chunk)}${units[i]}`);
    n = Math.floor(n / 1000);
    i++;
  }
  return `${groups.join(" ")} Pesos and ${String(centavos).padStart(2, "0")}/100 Only`;
}

// datetime-local <-> Manila wall-clock helpers for attendance corrections.
export function toManilaLocalInput(ts: string | null): string {
  if (!ts) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(ts));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function manilaInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(`${v}:00+08:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
