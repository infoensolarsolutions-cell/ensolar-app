import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayManila } from "@/lib/format";
import type { Celebration } from "@/components/celebrations-banner";

// Team birthdays and work anniversaries, today plus the coming week.
// Service-role read: names and dates only — every member may see these,
// while the employees table itself stays owner-guarded.
export async function upcomingCelebrations(days = 7): Promise<Celebration[]> {
  const admin = createAdminClient();
  const { data: employees } = await admin
    .from("employees")
    .select("name, birth_date, hired_at")
    .is("resigned_at", null)
    .limit(500);
  if (!employees?.length) return [];

  const today = todayManila();
  const labelFmt = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", month: "short", day: "numeric",
  });
  // The window of dates we scan, as month-day keys (leap birthdays Feb 29
  // are celebrated Feb 28 in common years).
  const window: { md: string; year: number; label: string; offset: number }[] = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(`${today}T12:00:00+08:00`);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    window.push({
      md: iso.slice(5),
      year: Number(iso.slice(0, 4)),
      label: labelFmt.format(d),
      offset: i,
    });
  }
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  const events: (Celebration & { offset: number })[] = [];
  for (const e of employees) {
    const sources: { kind: Celebration["kind"]; date: string | null }[] = [
      { kind: "birthday", date: e.birth_date },
      { kind: "anniversary", date: e.hired_at },
    ];
    for (const { kind, date } of sources) {
      if (!date) continue;
      let md = date.slice(5);
      for (const w of window) {
        const effMd = md === "02-29" && !isLeap(w.year) ? "02-28" : md;
        if (effMd !== w.md) continue;
        const years = w.year - Number(date.slice(0, 4));
        if (years <= 0) continue; // hired/born this year — nothing to celebrate yet
        events.push({
          kind,
          name: e.name,
          isToday: w.offset === 0,
          dateLabel: w.label,
          years,
          offset: w.offset,
        });
        break;
      }
    }
  }

  return events
    .sort((a, b) => a.offset - b.offset || a.name.localeCompare(b.name))
    .map(({ offset: _offset, ...c }) => c);
}
