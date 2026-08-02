"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { refreshDeyeDetail } from "../../projects/deye-actions";

export function StationDetailRefresher({
  projectId,
  stale,
}: {
  projectId: string;
  stale: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ran = useRef(false);

  useEffect(() => {
    if (!stale || ran.current) return;
    ran.current = true;
    startTransition(async () => {
      const res = await refreshDeyeDetail(projectId);
      if (!res.error) router.refresh();
    });
  }, [stale, projectId, router]);

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await refreshDeyeDetail(projectId);
          if (!res.error) router.refresh();
        })
      }
      className="shrink-0 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-60"
    >
      {pending ? "Loading…" : "⟳ Refresh"}
    </button>
  );
}
