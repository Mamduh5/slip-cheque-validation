"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReviewPairDecision } from "@/lib/models";

export interface ReviewQueueListItem {
  documentId: string;
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

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
    setError(null);
  }

  async function submitBulkReview(decision: ReviewPairDecision) {
    if (selectedIds.length === 0) return;

    const label = decisionLabel(decision).toLowerCase();
    const confirmed = window.confirm(
      `${decisionLabel(decision)} for ${selectedIds.length} selected item${selectedIds.length === 1 ? "" : "s"}? This records the same review decision for each eligible pending item.`
    );

    if (!confirmed) return;

    setError(null);
    setFeedback(null);
    setPendingDecision(decision);

    const response = await fetch("/api/review/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        decision,
        documentIds: selectedIds
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
    setFeedback(`${updated} updated, ${skipped} skipped.`);
    setSelectedIds([]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm">
        <span className="text-slate-600">
          {selectedIds.length} selected on this page
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-300"
            data-testid="review-select-all"
            type="button"
            disabled={selectedIds.length === items.length}
            onClick={selectAllOnPage}
          >
            Select all on page
          </button>
          <button
            className="rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-300"
            data-testid="review-clear-selection"
            type="button"
            disabled={selectedIds.length === 0}
            onClick={clearSelection}
          >
            Clear selection
          </button>
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <div
          className="sticky top-2 z-10 flex flex-col gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          data-testid="review-bulk-action-bar"
        >
          <div>
            <p className="text-sm font-medium text-orange-950">
              {selectedIds.length} pending item{selectedIds.length === 1 ? "" : "s"} selected
            </p>
            <p className="text-xs text-orange-900">Bulk actions apply only to eligible pending review items.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="bulk-confirm-duplicate"
              type="button"
              disabled={pendingDecision !== null}
              onClick={() => submitBulkReview("CONFIRMED_DUPLICATE")}
            >
              {pendingDecision === "CONFIRMED_DUPLICATE" ? "Saving..." : "Confirm duplicate"}
            </button>
            <button
              className="rounded-md border border-orange-200 bg-white px-3 py-1.5 text-sm font-medium text-orange-950 hover:border-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="bulk-confirm-distinct"
              type="button"
              disabled={pendingDecision !== null}
              onClick={() => submitBulkReview("CONFIRMED_DISTINCT")}
            >
              {pendingDecision === "CONFIRMED_DISTINCT" ? "Saving..." : "Confirm distinct"}
            </button>
            <button
              className="rounded-md border border-orange-200 bg-white px-3 py-1.5 text-sm text-orange-950 hover:border-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={pendingDecision !== null}
              onClick={clearSelection}
            >
              Clear
            </button>
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
                  href={`/review/${item.documentId}`}
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
