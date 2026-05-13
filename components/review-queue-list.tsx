"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReviewPairDecision } from "@/lib/models";
import { getSelectedPageItems } from "@/lib/review-selection";

export interface ReviewQueueListItem {
  documentId: string;
  reviewHref: string;
  filename: string;
  uploadedAt: string;
  amount: string | null;
  receiver: string | null;
  reference: string | null;
  dateTime: string | null;
  similarityLabel: string | null;
  matchedFilename: string | null;
  reasonSummary: string;
}

interface BulkReviewResponse {
  updatedCount: number;
  skippedCount: number;
  notFoundCount: number;
  failedCount: number;
  error?: string;
}

function decisionLabel(decision: ReviewPairDecision) {
  return decision === "CONFIRMED_DUPLICATE" ? "Confirm duplicate" : "Confirm distinct";
}

export function ReviewQueueList({ items }: { items: ReviewQueueListItem[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDecision, setPendingDecision] = useState<ReviewPairDecision | null>(null);
  const [confirmationDecision, setConfirmationDecision] = useState<ReviewPairDecision | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(() => getSelectedPageItems(items, selectedIds), [items, selectedIds]);
  const sampleItems = selectedItems.slice(0, 3);

  function toggleItem(documentId: string) {
    setFeedback(null);
    setError(null);
    setSelectedIds((current) =>
      current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId]
    );
  }

  function selectAllOnPage() {
    setFeedback(null);
    setError(null);
    setSelectedIds(items.map((item) => item.documentId));
  }

  function clearSelection() {
    setSelectedIds([]);
    setReviewNote("");
    setError(null);
    setConfirmationDecision(null);
  }

  function requestBulkReview(decision: ReviewPairDecision) {
    if (selectedItems.length === 0) return;
    setError(null);
    setFeedback(null);
    setConfirmationDecision(decision);
  }

  async function submitBulkReview(decision: ReviewPairDecision) {
    const selectedPageIds = selectedItems.map((item) => item.documentId);
    if (selectedPageIds.length === 0) return;

    const label = decisionLabel(decision).toLowerCase();
    const hasNote = reviewNote.trim().length > 0;

    setError(null);
    setFeedback(null);
    setPendingDecision(decision);
    setConfirmationDecision(null);

    const response = await fetch("/api/review/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        decision,
        documentIds: selectedPageIds,
        reviewNote
      })
    });
    const payload = (await response.json().catch(() => null)) as BulkReviewResponse | null;

    setPendingDecision(null);

    if (!response.ok) {
      setError(payload?.error ?? `Could not ${label} for the selected items.`);
      return;
    }

    const updated = payload?.updatedCount ?? 0;
    const skipped = (payload?.skippedCount ?? 0) + (payload?.notFoundCount ?? 0) + (payload?.failedCount ?? 0);
    setFeedback(`${updated} updated, ${skipped} skipped.${hasNote && updated > 0 ? " Review note applied to updated items." : ""}`);
    setSelectedIds([]);
    setReviewNote("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm">
        <span className="text-slate-600">
          {selectedItems.length} selected on this page
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-300"
            data-testid="review-select-all"
            type="button"
            disabled={selectedItems.length === items.length}
            onClick={selectAllOnPage}
          >
            Select all on page
          </button>
          <button
            className="rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-300"
            data-testid="review-clear-selection"
            type="button"
            disabled={selectedItems.length === 0}
            onClick={clearSelection}
          >
            Clear selection
          </button>
        </div>
      </div>

      {selectedItems.length > 0 ? (
        <div
          className="sticky top-2 z-10 flex flex-col gap-3 rounded-lg border border-line bg-white p-3 shadow-sm lg:flex-row lg:items-end lg:justify-between"
          data-testid="review-bulk-action-bar"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">
              {selectedItems.length} pending item{selectedItems.length === 1 ? "" : "s"} selected
            </p>
            <p className="text-xs text-slate-500">Selection is page-scoped. Bulk actions apply only to selected visible pending items.</p>
            <label className="mt-2 block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="bulk-review-note">
              Review note <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              id="bulk-review-note"
              maxLength={500}
              placeholder="Apply one note to this batch"
              type="text"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="bulk-confirm-duplicate"
              type="button"
              disabled={pendingDecision !== null}
              onClick={() => requestBulkReview("CONFIRMED_DUPLICATE")}
            >
              {pendingDecision === "CONFIRMED_DUPLICATE" ? "Saving..." : "Confirm duplicate"}
            </button>
            <button
              className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="bulk-confirm-distinct"
              type="button"
              disabled={pendingDecision !== null}
              onClick={() => requestBulkReview("CONFIRMED_DISTINCT")}
            >
              {pendingDecision === "CONFIRMED_DISTINCT" ? "Saving..." : "Confirm distinct"}
            </button>
            <button
              className="rounded-md border border-line bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={pendingDecision !== null}
              onClick={clearSelection}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {confirmationDecision && selectedItems.length > 0 ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4 py-6" data-testid="bulk-review-modal-backdrop">
          <div
            aria-labelledby="bulk-review-confirm-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-lg border border-line bg-white p-4 shadow-xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink" id="bulk-review-confirm-title">
                  Confirm bulk review
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {decisionLabel(confirmationDecision)} for {selectedItems.length} selected item{selectedItems.length === 1 ? "" : "s"}.
                </p>
              </div>
              <button
                aria-label="Close bulk review confirmation"
                className="rounded-md border border-line px-2 py-1 text-sm text-slate-600 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pendingDecision !== null}
                type="button"
                onClick={() => setConfirmationDecision(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                Selection is page-scoped. This action only affects selected items visible on the current review queue page.
              </p>
              <p className="mt-2">
                The same review decision{reviewNote.trim() ? " and note" : ""} will be submitted for each eligible pending item.
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sample affected items</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {sampleItems.map((item) => (
                  <li className="truncate rounded border border-slate-200 px-2 py-1" key={item.documentId}>
                    {item.filename}
                  </li>
                ))}
              </ul>
              {selectedItems.length > sampleItems.length ? (
                <p className="mt-2 text-xs text-slate-500">
                  +{selectedItems.length - sampleItems.length} more selected on this page.
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pendingDecision !== null}
                type="button"
                onClick={() => setConfirmationDecision(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="bulk-review-modal-confirm"
                disabled={pendingDecision !== null}
                type="button"
                onClick={() => submitBulkReview(confirmationDecision)}
              >
                {pendingDecision === confirmationDecision ? "Saving..." : decisionLabel(confirmationDecision)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" data-testid="bulk-review-feedback">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="bulk-review-error">
          {error}
        </p>
      ) : null}

      {items.map((item) => {
        const selected = selectedSet.has(item.documentId);

        return (
          <div
            className={`rounded-lg border bg-white p-4 shadow-sm ${
              selected ? "border-accent ring-1 ring-accent/30" : "border-line"
            }`}
            data-testid="review-queue-item"
            key={item.documentId}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 gap-3">
                <input
                  aria-label={`Select ${item.filename}`}
                  checked={selected}
                  className="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent"
                  data-testid="review-item-checkbox"
                  type="checkbox"
                  onChange={() => toggleItem(item.documentId)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-ink">{item.filename}</span>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800">
                      Likely duplicate
                    </span>
                    {item.similarityLabel ? (
                      <span className="shrink-0 text-xs text-slate-500">{item.similarityLabel}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Uploaded {item.uploadedAt}</p>

                  {(item.amount || item.receiver || item.reference || item.dateTime) && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
                      {item.amount ? (
                        <div>
                          <dt className="text-slate-400">Amount</dt>
                          <dd className="font-medium text-ink">THB {item.amount}</dd>
                        </div>
                      ) : null}
                      {item.receiver ? (
                        <div>
                          <dt className="text-slate-400">Receiver</dt>
                          <dd className="truncate font-medium text-ink">{item.receiver}</dd>
                        </div>
                      ) : null}
                      {item.reference ? (
                        <div>
                          <dt className="text-slate-400">Reference</dt>
                          <dd className="truncate font-mono font-medium text-ink">{item.reference}</dd>
                        </div>
                      ) : null}
                      {item.dateTime ? (
                        <div>
                          <dt className="text-slate-400">Date / time</dt>
                          <dd className="font-medium text-ink">{item.dateTime}</dd>
                        </div>
                      ) : null}
                    </dl>
                  )}

                  {item.matchedFilename ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Matched with: <span className="font-medium text-slate-700">{item.matchedFilename}</span>
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    Reason: <span className="font-medium text-slate-700">{item.reasonSummary}</span>
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Link
                  href={item.reviewHref}
                  className="inline-flex items-center justify-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
                >
                  Compare &amp; review
                </Link>
                <Link
                  href={`/documents/${item.documentId}`}
                  className="inline-flex items-center justify-center rounded-md border border-line bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
                >
                  Full detail
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
