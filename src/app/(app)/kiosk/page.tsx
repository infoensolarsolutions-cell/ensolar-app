import type { Metadata } from "next";
import Image from "next/image";
import { requireRole } from "@/lib/auth";
import { KioskClient } from "./kiosk-client";

export const metadata: Metadata = { title: "Attendance Kiosk" };

export default async function KioskPage() {
  await requireRole("owner", "office_staff");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-brand-yellow/10 p-6">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Image src="/branding/logo.svg" alt="Ensolar" width={56} height={56} />
        <h1 className="text-xl font-extrabold text-gray-900">Attendance Kiosk</h1>
        <p className="text-sm text-gray-600">Clock in / clock out with your PIN</p>
      </div>
      <KioskClient />
    </div>
  );
}
