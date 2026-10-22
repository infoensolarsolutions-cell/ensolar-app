"use client";

import { useEffect, useState } from "react";

export type Celebration = {
  kind: "birthday" | "anniversary";
  name: string;
  isToday: boolean;
  dateLabel: string; // e.g. "Oct 25"
  years: number | null; // age turning, or years with the company
};

// Dismissible once per day (per device) — reappears tomorrow if there are
// still celebrations coming up.
export function CelebrationsBanner({
  items,
  todayKey,
}: {
  items: Celebration[];
  todayKey: string;
}) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem("celebrations-dismissed") === todayKey);
    } catch {
      setHidden(false);
    }
  }, [todayKey]);

  if (!items.length || hidden) return null;

  const todays = items.filter((i) => i.isToday);
  const upcoming = items.filter((i) => !i.isToday);
  const line = (c: Celebration) =>
    c.kind === "birthday"
      ? `🎂 ${c.name}${c.years ? ` turns ${c.years}` : ""}`
      : `🎉 ${c.name} — ${c.years} year${c.years === 1 ? "" : "s"} with Ensolar`;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-pink-200 bg-pink-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-sm text-gray-800">
          {todays.length > 0 && (
            <p className="font-semibold">
              🥳 Today: {todays.map((c) => line(c)).join(" · ")}
            </p>
          )}
          {upcoming.length > 0 && (
            <p className={todays.length ? "mt-1 text-xs text-gray-600" : "text-xs text-gray-700"}>
              Coming up: {upcoming.map((c) => `${line(c)} (${c.dateLabel})`).join(" · ")}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss for today"
          onClick={() => {
            try {
              localStorage.setItem("celebrations-dismissed", todayKey);
            } catch {
              // Storage blocked — hide for this view only.
            }
            setHidden(true);
          }}
          className="shrink-0 px-1 text-gray-400"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
