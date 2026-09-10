"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setActiveBranch } from "@/app/(app)/branch-actions";

// Owner's branch lens: shown only when more than one branch exists.
export function BranchSwitcher({
  branches,
  active,
}: {
  branches: { id: string; name: string; code: string }[];
  active: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (branches.length < 2) return null;

  return (
    <select
      value={active}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await setActiveBranch(e.target.value);
          router.refresh();
        })
      }
      className="w-full rounded-lg border border-brand-green/40 bg-brand-green/5 px-2.5 py-2 text-sm font-semibold text-brand-green-dark focus:border-brand-green focus:outline-none disabled:opacity-60"
    >
      <option value="all">🏢 All branches</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          🏢 {b.name}
        </option>
      ))}
    </select>
  );
}
