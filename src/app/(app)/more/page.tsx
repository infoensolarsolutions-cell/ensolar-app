import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { getProfile, ROLE_LABELS } from "@/lib/auth";
import { signOut } from "@/app/(public)/login/actions";

export const metadata: Metadata = { title: "More" };

export default async function MorePage() {
  const profile = (await getProfile())!;

  return (
    <>
      <TopBar title="More" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-semibold text-gray-900">
            {profile.name || profile.email}
          </p>
          <p className="text-sm text-gray-600">{profile.email}</p>
          <span className="mt-2 inline-block rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green-dark">
            {ROLE_LABELS[profile.role]}
          </span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">
            Customers, reports, and settings will live here as Module A grows.
          </p>
        </div>
        <form action={signOut}>
          <button className="w-full rounded-xl border border-red-200 bg-white px-4 py-3.5 text-base font-semibold text-red-600 active:bg-red-50">
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
