"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReviewPairDecision } from "@/lib/models";

export function ReviewActions({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pendingDecision, setPendingDecision] = useState<ReviewPairDecision | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submitReview(decision: ReviewPairDecision) {
    setError(null);
    setPendingDecision(decision);

    const response = await fetch(`/api/documents/${documentId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ decision, reviewNote })
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    setPendingDecision(null);

    if (!response.ok) {
      setError(payload?.error ?? "Review could not be saved.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-semibold text-orange-950">Review this likely duplicate</h2>
          <p className="mt-1 text-sm leading-6 text-orange-900">
            The system thinks these images may show the same document. Your review is stored separately.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 lg:max-w-md">
          <label className="text-xs font-medium uppercase tracking-wide text-orange-900" htmlFor={`review-note-${documentId}`}>
            Review note <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            className="min-h-16 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            id={`review-note-${documentId}`}
            maxLength={500}
            placeholder="Add brief context for this decision"
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={pendingDecision !== null}
              onClick={() => submitReview("CONFIRMED_DUPLICATE")}
            >
              {pendingDecision === "CONFIRMED_DUPLICATE" ? "Saving..." : "Confirm duplicate"}
            </button>
            <button
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={pendingDecision !== null}
              onClick={() => submitReview("CONFIRMED_DISTINCT")}
            >
              {pendingDecision === "CONFIRMED_DISTINCT" ? "Saving..." : "Confirm distinct"}
            </button>
          </div>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
