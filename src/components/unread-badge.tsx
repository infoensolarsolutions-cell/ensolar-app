"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Red unread-messages badge for the nav. Polls every 45s, refreshes on tab
// focus and whenever navigation happens (e.g. after reading a thread).
export function UnreadBadge({ variant = "pill" }: { variant?: "pill" | "dot" }) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/unread-messages");
        const json = (await res.json()) as { count?: number };
        if (alive) setCount(json.count ?? 0);
      } catch {
        // Offline or signed out — keep the last value quietly.
      }
    };
    load();
    const timer = setInterval(load, 45_000);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [pathname]);

  if (count === 0) return null;
  const label = count > 99 ? "99+" : String(count);

  if (variant === "dot") {
    return (
      <span
        aria-label={`${count} unread message${count === 1 ? "" : "s"}`}
        className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
      >
        {label}
      </span>
    );
  }
  return (
    <span
      aria-label={`${count} unread message${count === 1 ? "" : "s"}`}
      className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold leading-none text-white"
    >
      {label}
    </span>
  );
}
