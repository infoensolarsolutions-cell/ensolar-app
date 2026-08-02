"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { refreshFleet } from "../projects/deye-actions";

export function RefreshAllButton() {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const autoRan = useRef(false);

  // Refresh stale stations automatically when the page opens.
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    startTransition(async () => {
      const res = await refreshFleet();
      if (!res.error && (res.refreshed ?? 0) > 0) router.refresh();
    });
  }, [router]);

  return (
    <span className="flex items-center gap-2">
      {note && <span className="text-xs text-gray-500">{note}</span>}
      <button
        disabled={pending}
        onClick={() => {
          setNote(null);
          startTransition(async () => {
            const res = await refreshFleet();
            if (res.error) setNote(res.error);
            else {
              setNote(`refreshed ${res.refreshed ?? 0}`);
              router.refresh();
            }
          });
        }}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-60"
      >
        {pending ? "Refreshing…" : "⟳ Refresh all"}
      </button>
    </span>
  );
}
