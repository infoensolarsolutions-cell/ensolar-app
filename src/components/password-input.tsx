"use client";

import { useState } from "react";

export function PasswordInput({
  id,
  name,
  autoComplete,
  minLength,
}: {
  id: string;
  name: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        className="w-full rounded-lg border border-gray-300 py-3 pl-3 pr-12 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-500"
      >
        {visible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M6.7 6.9C4.6 8.2 3 10 2 12c1.8 3.6 5.5 6 10 6 1.5 0 2.9-.3 4.2-.8m2.1-1.2c1.6-1.1 2.9-2.5 3.7-4-1.8-3.6-5.5-6-10-6-.7 0-1.4.1-2 .2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12c1.8-3.6 5.5-6 10-6s8.2 2.4 10 6c-1.8 3.6-5.5 6-10 6s-8.2-2.4-10-6Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        )}
      </button>
    </div>
  );
}
