import "server-only";
import { pesoInWords } from "@/lib/format";

// "20th day of July, 2026" (Manila)
export function dateLongManila(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", day: "numeric", month: "long", year: "numeric",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = Number(get("day"));
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : ["th", "st", "nd", "rd"][day % 10 > 3 ? 0 : day % 10];
  return `${day}${suffix} day of ${get("month")}, ${get("year")}`;
}

export type ContractData = {
  customer_name: string;
  customer_address: string;
  system_description: string;
  system_short: string;
  equipment_list: string;
  quote_no: string;
  quote_date: string;
  total: number;
  payment_schedule: string;
  signing_place: string;
};

export function fillTemplate(template: string, data: ContractData): string {
  const totalFigures = data.total.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const map: Record<string, string> = {
    DATE_LONG: dateLongManila(),
    CUSTOMER_NAME: data.customer_name.toUpperCase(),
    CUSTOMER_ADDRESS: data.customer_address,
    SYSTEM_DESCRIPTION: data.system_description,
    SYSTEM_SHORT: data.system_short,
    EQUIPMENT_LIST: data.equipment_list,
    QUOTE_NO: data.quote_no,
    QUOTE_DATE: data.quote_date,
    TOTAL_WORDS: pesoInWords(data.total).toUpperCase(),
    TOTAL_FIGURES: totalFigures,
    PAYMENT_SCHEDULE: data.payment_schedule,
    SIGNING_PLACE: data.signing_place,
  };
  return template.replace(/\{\{(\w+)\}\}/g, (m, key) => map[key] ?? m);
}
