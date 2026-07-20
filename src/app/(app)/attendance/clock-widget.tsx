"use client";

import { useState, useTransition } from "react";
import { clockIn, clockOut } from "./actions";

export function ClockWidget({ openSince }: { openSince: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function doClockIn() {
    setError(null);
    // GPS is optional (Spec §6.1) — proceed either way.
    const run = (lat?: number, lng?: number) =>
      startTransition(async () => {
        const res = await clockIn(lat, lng);
        if (res.error) setError(res.error);
      });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => run(pos.coords.latitude, pos.coords.longitude),
        () => run(),
        { timeout: 4000 },
      );
    } else run();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
      {openSince ? (
        <>
          <p className="text-sm text-gray-600">
            Clocked in since{" "}
            <span className="font-bold text-gray-900">
              {new Intl.DateTimeFormat("en-PH", {
                hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
              }).format(new Date(openSince))}
            </span>
          </p>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await clockOut();
                if (res.error) setError(res.error);
              })
            }
            className="mt-3 w-full rounded-2xl bg-red-600 px-4 py-5 text-lg font-extrabold text-white active:bg-red-700 disabled:opacity-60"
          >
            {pending ? "Working…" : "CLOCK OUT"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">You are not clocked in.</p>
          <button
            disabled={pending}
            onClick={doClockIn}
            className="mt-3 w-full rounded-2xl bg-brand-green px-4 py-5 text-lg font-extrabold text-white active:bg-brand-green-dark disabled:opacity-60"
          >
            {pending ? "Working…" : "CLOCK IN"}
          </button>
        </>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}
