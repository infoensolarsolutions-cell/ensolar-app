import type { Metadata } from "next";
import Image from "next/image";
import { InquiryForm } from "./inquiry-form";

export const metadata: Metadata = {
  title: "Inquire Now",
  description:
    "Request a free quotation for solar, electrical, CCTV, FDAS, or solar pump installation in Dumaguete City and Negros Oriental.",
};

export default function InquirePage() {
  return (
    <div className="min-h-dvh bg-brand-yellow/10 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image
            src="/branding/logo.svg"
            alt="Ensolar Solutions"
            width={72}
            height={72}
            priority
          />
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">
              Ensolar Solutions Installation Services
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Solar • Electrical • CCTV • FDAS • Solar Pumps
            </p>
            <p className="text-sm text-gray-600">
              Dumaguete City, Negros Oriental
            </p>
          </div>
        </div>
        <InquiryForm />
        <p className="mt-6 text-center text-xs text-gray-500">
          19 Espina Road, Taclobo, Dumaguete City • (035) 531-6455 •
          info.ensolarsolutions@gmail.com
        </p>
      </div>
    </div>
  );
}
