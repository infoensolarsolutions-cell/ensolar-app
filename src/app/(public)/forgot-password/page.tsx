import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
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
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-gray-900">
              Reset your password
            </h1>
            <p className="text-sm text-gray-600">
              We will email you a reset link.
            </p>
          </div>
        </div>
        <ForgotPasswordForm />
        <p className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-brand-green-dark underline"
          >
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
