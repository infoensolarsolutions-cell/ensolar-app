"use client";

import { useState, useTransition } from "react";
import { submitRating } from "./rating-actions";

export function RateService({ projectId }: { projectId: string }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
        🙏 Thank you for your feedback!
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-brand-yellow bg-brand-yellow/10 p-3">
      <p className="text-sm font-semibold text-gray-900">
        How satisfied are you with our service?
      </p>
      <div className="mt-1.5 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setStars(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="text-3xl leading-none"
          >
            {n <= stars ? "⭐" : "☆"}
          </button>
        ))}
      </div>
      {stars > 0 && (
        <div className="mt-2 space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Any comments for us? (optional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
          />
          <button
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await submitRating(projectId, stars, comment);
                if (res.error) setError(res.error);
                else setDone(true);
              });
            }}
            className="w-full rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send feedback"}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}
