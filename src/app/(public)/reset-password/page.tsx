import type { Metadata } from "next";
import Image from "next/image";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Set new password" };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-brand-yellow/10 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/branding/logo.svg"
            alt="Ensolar Solutions"
            width={72}
            height={72}
            priority
          />
          <h1 className="text-xl font-extrabold text-gray-900">
            Choose a new password
          </h1>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
