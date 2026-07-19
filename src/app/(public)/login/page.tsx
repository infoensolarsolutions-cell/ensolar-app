import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  const { link } = await searchParams;
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
              Ensolar Solutions
            </h1>
            <p className="text-sm text-gray-600">Business Management System</p>
          </div>
        </div>
        {link === "expired" && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm font-medium text-amber-800">
            That link has expired or was already used. Log in or request a new
            reset link below.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
