"use client";

import { useState, useTransition } from "react";
import { correctClockOut } from "./actions";

export function FixClockOut({
  attendanceId,
  auto,
}: {
  attendanceId: string;
  auto: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("17:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`text-xs underline ${auto ? "font-semibold text-amber-700" : "text-gray-400"}`}
      >
        {auto ? "fix time" : "edit"}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
      />
      <button
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await correctClockOut(
              attendanceId,
              time,
              auto ? "Actual clock-out reported after auto clock-out" : "Corrected by office staff",
            );
            if (res.error) setError(res.error);
            else setOpen(false);
          });
        }}
        className="rounded-lg bg-brand-green px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? "…" : "Save"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-400 underline">
        ✕
      </button>
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </span>
  );
}
