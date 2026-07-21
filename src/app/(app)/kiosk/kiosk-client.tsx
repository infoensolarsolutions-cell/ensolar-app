"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { kioskClock, type KioskResult } from "./actions";

export function KioskClient() {
  const [state, formAction, pending] = useActionState<KioskResult | null, FormData>(
    kioskClock,
    null,
  );
  const [pin, setPin] = useState("");
  const [shown, setShown] = useState<KioskResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Show each result for a few seconds, then reset for the next person.
  useEffect(() => {
    if (state) {
      setShown(state);
      setPin("");
      const t = setTimeout(() => setShown(null), 6000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const press = (d: string) => {
    setShown(null);
    if (d === "⌫") setPin((p) => p.slice(0, -1));
    else if (pin.length < 6) setPin((p) => p + d);
  };

  const submit = () => {
    if (pin.length >= 4 && !pending) formRef.current?.requestSubmit();
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      {shown?.ok && (
        <div className="mb-4 rounded-2xl bg-green-50 p-5 text-center">
          <p className="text-xl font-extrabold text-green-800">{shown.name}</p>
          <p className="mt-1 text-base font-medium text-green-700">{shown.message}</p>
        </div>
      )}
      {shown?.error && (
        <p className="mb-4 rounded-2xl bg-red-50 p-4 text-center text-base font-semibold text-red-700">
          {shown.error}
        </p>
      )}

      <form ref={formRef} action={formAction}>
        <input type="hidden" name="pin" value={pin} />
        <div className="mb-4 flex h-14 items-center justify-center rounded-2xl border-2 border-gray-300 bg-white text-3xl font-bold tracking-[0.5em] text-gray-800">
          {pin ? "•".repeat(pin.length) : <span className="text-base font-medium tracking-normal text-gray-400">Enter your PIN</span>}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => press(d)}
              className={`rounded-xl border border-gray-200 bg-white py-5 text-2xl font-bold text-gray-800 active:bg-gray-100 ${
                d === "1" ? "" : ""
              }`}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={submit}
            disabled={pin.length < 4 || pending}
            className="rounded-xl bg-brand-green py-5 text-xl font-bold text-white active:bg-brand-green-dark disabled:opacity-40"
          >
            {pending ? "…" : "GO"}
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        Type your PIN and press GO. First entry of the day clocks you IN,
        the next clocks you OUT.
      </p>
    </div>
  );
}
