"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReviewPairDecision } from "@/lib/models";
import {
  getReviewKeyboardShortcutAction,
  isReviewKeyboardShortcutBlocked
} from "@/lib/review-keyboard-shortcuts";

type ReviewActionId = "duplicate" | "distinct" | "duplicate-next" | "distinct-next";

export function ReviewActions({
  documentId,
  nextHref,
  queueNextHref,
  queuePreviousHref,
  enableShortcuts = false
}: {
  documentId: string;
  nextHref?: string | null;
  queueNextHref?: string | null;
  queuePreviousHref?: string | null;
  enableShortcuts?: boolean;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ReviewActionId | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitReview = useCallback(async (decision: ReviewPairDecision, actionId: ReviewActionId, redirectHref?: string | null) => {
    setError(null);
    setPendingAction(actionId);

    const response = await fetch(`/api/documents/${documentId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ decision, reviewNote })
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    setPendingAction(null);

    if (!response.ok) {
      setError(payload?.error ?? "Review could not be saved.");
      return;
    }

    if (redirectHref) {
      router.push(redirectHref);
      router.refresh();
      return;
    }

    router.refresh();
  }, [documentId, reviewNote, router]);

  const isPending = pendingAction !== null;

  useEffect(() => {
    if (!enableShortcuts) return;

    function hasOpenDialog() {
      return Boolean(document.querySelector("dialog[open], [role='dialog'], [aria-modal='true']"));
    }

    function handleKeyDown(event: KeyboardEvent) {
      const action = getReviewKeyboardShortcutAction(event.key);
      if (!action || event.repeat || isPending) return;

      if (
        isReviewKeyboardShortcutBlocked({
          target: event.target as Element | null,
          hasOpenDialog: hasOpenDialog()
        })
      ) {
        return;
      }

      if (action === "confirm-duplicate") {
        event.preventDefault();
        void submitReview("CONFIRMED_DUPLICATE", "duplicate");
        return;
      }

      if (action === "confirm-distinct") {
        event.preventDefault();
        void submitReview("CONFIRMED_DISTINCT", "distinct");
        return;
      }

      const href = action === "next-item" ? queueNextHref : queuePreviousHref;
      if (href) {
        event.preventDefault();
        router.push(href);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableShortcuts, isPending, queueNextHref, queuePreviousHref, router, submitReview]);

  return (
    <div className="mt-4 rounded-md border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-semibold text-ink">Review this likely duplicate</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            The system thinks these images may show the same document. Your review is stored separately.
          </p>
          {enableShortcuts ? (
            <p className="mt-2 text-xs text-slate-500">
              Shortcuts: <kbd className="rounded border border-line bg-slate-50 px-1 py-0.5">1</kbd> duplicate,{" "}
              <kbd className="rounded border border-line bg-slate-50 px-1 py-0.5">2</kbd> distinct.
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 lg:max-w-md">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor={`review-note-${documentId}`}>
            Review note <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            className="min-h-16 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
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
              disabled={isPending}
              onClick={() => submitReview("CONFIRMED_DUPLICATE", "duplicate")}
            >
              {pendingAction === "duplicate" ? "Saving..." : <>Confirm duplicate {enableShortcuts ? <span className="ml-1 text-xs opacity-80">(1)</span> : null}</>}
            </button>
            <button
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={isPending}
              onClick={() => submitReview("CONFIRMED_DISTINCT", "distinct")}
            >
              {pendingAction === "distinct" ? "Saving..." : <>Confirm distinct {enableShortcuts ? <span className="ml-1 text-xs opacity-70">(2)</span> : null}</>}
            </button>
          </div>
          {nextHref ? (
            <div className="flex flex-col gap-2 border-t border-line pt-2 sm:flex-row">
              <button
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={isPending}
                onClick={() => submitReview("CONFIRMED_DUPLICATE", "duplicate-next", nextHref)}
              >
                {pendingAction === "duplicate-next" ? "Saving..." : "Confirm duplicate & next"}
              </button>
              <button
                className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={isPending}
                onClick={() => submitReview("CONFIRMED_DISTINCT", "distinct-next", nextHref)}
              >
                {pendingAction === "distinct-next" ? "Saving..." : "Confirm distinct & next"}
              </button>
            </div>
          ) : (
            <p className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs text-slate-600">
              End of queue for this view. Save this item, then return to the queue.
            </p>
          )}
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
