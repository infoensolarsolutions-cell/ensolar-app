import type { Metadata } from "next";
import Image from "next/image";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(public)/login/actions";

export const metadata: Metadata = { title: "Customer Portal" };

export default async function PortalPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <Image
        src="/branding/logo.svg"
        alt="Ensolar Solutions"
        width={64}
        height={64}
      />
      <h1 className="mt-4 text-lg font-bold text-gray-900">
        Welcome, {profile.name || "Customer"}
      </h1>
      <p className="mt-2 max-w-xs text-sm text-gray-600">
        The customer portal — project status, payments, and service requests —
        is coming soon. Please contact our office at (035) 531-6455 in the
        meantime.
      </p>
      <form action={signOut} className="mt-6">
        <button className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700">
          Sign out
        </button>
      </form>
    </div>
  );
}
