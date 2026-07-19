import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
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
        <LoginForm />
      </div>
    </div>
  );
}
