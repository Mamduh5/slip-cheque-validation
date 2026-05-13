"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReviewPairDecision } from "@/lib/models";
import { getSelectedPageItems } from "@/lib/review-selection";
import { createTranslator, type SupportedLocale } from "@/lib/i18n";

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

function decisionLabel(decision: ReviewPairDecision, locale: SupportedLocale) {
  const t = createTranslator(locale);

  return decision === "CONFIRMED_DUPLICATE"
    ? t("reviewQueue.actions.confirmDuplicate")
    : t("reviewQueue.actions.confirmDistinct");
}

export function ReviewQueueList({ items, locale }: { items: ReviewQueueListItem[]; locale: SupportedLocale }) {
  const router = useRouter();
  const t = createTranslator(locale);
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

    const label = decisionLabel(decision, locale).toLowerCase();
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
      setError(payload?.error ?? t("reviewQueue.bulk.error", { decision: label }));
      return;
    }

    const updated = payload?.updatedCount ?? 0;
    const skipped = (payload?.skippedCount ?? 0) + (payload?.notFoundCount ?? 0) + (payload?.failedCount ?? 0);
    setFeedback(
      t(hasNote && updated > 0 ? "reviewQueue.bulk.feedbackWithNote" : "reviewQueue.bulk.feedback", {
        updated,
        skipped
      })
    );
    setSelectedIds([]);
    setReviewNote("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm">
        <span className="text-slate-600">
          {t("reviewQueue.bulk.selectedOnPage", { count: selectedItems.length })}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-300"
            data-testid="review-select-all"
            type="button"
            disabled={selectedItems.length === items.length}
            onClick={selectAllOnPage}
          >
            {t("reviewQueue.actions.selectAllOnPage")}
          </button>
          <button
            className="rounded-md border border-line px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-300"
            data-testid="review-clear-selection"
            type="button"
            disabled={selectedItems.length === 0}
            onClick={clearSelection}
          >
            {t("reviewQueue.actions.clearSelection")}
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
              {t("reviewQueue.bulk.pendingSelected", {
                count: selectedItems.length,
                itemLabel: t(selectedItems.length === 1 ? "reviewQueue.bulk.itemOne" : "reviewQueue.bulk.itemOther")
              })}
            </p>
            <p className="text-xs text-slate-500">{t("reviewQueue.bulk.scopeNote")}</p>
            <label className="mt-2 block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="bulk-review-note">
              {t("reviewQueue.bulk.reviewNote")}{" "}
              <span className="font-normal normal-case tracking-normal">{t("reviewQueue.bulk.optional")}</span>
            </label>
            <input
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              id="bulk-review-note"
              maxLength={500}
              placeholder={t("reviewQueue.bulk.notePlaceholder")}
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
              {pendingDecision === "CONFIRMED_DUPLICATE"
                ? t("reviewQueue.actions.saving")
                : t("reviewQueue.actions.confirmDuplicate")}
            </button>
            <button
              className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="bulk-confirm-distinct"
              type="button"
              disabled={pendingDecision !== null}
              onClick={() => requestBulkReview("CONFIRMED_DISTINCT")}
            >
              {pendingDecision === "CONFIRMED_DISTINCT"
                ? t("reviewQueue.actions.saving")
                : t("reviewQueue.actions.confirmDistinct")}
            </button>
            <button
              className="rounded-md border border-line bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={pendingDecision !== null}
              onClick={clearSelection}
            >
              {t("reviewQueue.actions.clear")}
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
                  {t("reviewQueue.bulk.confirmTitle")}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {t("reviewQueue.bulk.confirmSummary", {
                    decision: decisionLabel(confirmationDecision, locale),
                    count: selectedItems.length,
                    itemLabel: t(selectedItems.length === 1 ? "reviewQueue.bulk.itemOne" : "reviewQueue.bulk.itemOther")
                  })}
                </p>
              </div>
              <button
                aria-label={t("reviewQueue.bulk.closeAria")}
                className="rounded-md border border-line px-2 py-1 text-sm text-slate-600 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pendingDecision !== null}
                type="button"
                onClick={() => setConfirmationDecision(null)}
              >
                {t("reviewQueue.actions.close")}
              </button>
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                {t("reviewQueue.bulk.modalScope")}
              </p>
              <p className="mt-2">
                {t("reviewQueue.bulk.modalDecision", {
                  noteText: reviewNote.trim() ? ` ${t("reviewQueue.bulk.andNote")}` : ""
                })}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("reviewQueue.bulk.sampleItems")}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {sampleItems.map((item) => (
                  <li className="truncate rounded border border-slate-200 px-2 py-1" key={item.documentId}>
                    {item.filename}
                  </li>
                ))}
              </ul>
              {selectedItems.length > sampleItems.length ? (
                <p className="mt-2 text-xs text-slate-500">
                  {t("reviewQueue.bulk.moreSelected", { count: selectedItems.length - sampleItems.length })}
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
                {t("reviewQueue.actions.cancel")}
              </button>
              <button
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="bulk-review-modal-confirm"
                disabled={pendingDecision !== null}
                type="button"
                onClick={() => submitBulkReview(confirmationDecision)}
              >
                {pendingDecision === confirmationDecision
                  ? t("reviewQueue.actions.saving")
                  : decisionLabel(confirmationDecision, locale)}
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
                  aria-label={t("reviewQueue.row.selectAria", { filename: item.filename })}
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
                      {t("reviewQueue.row.likelyDuplicate")}
                    </span>
                    {item.similarityLabel ? (
                      <span className="shrink-0 text-xs text-slate-500">{item.similarityLabel}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{t("reviewQueue.row.uploaded", { date: item.uploadedAt })}</p>

                  {(item.amount || item.receiver || item.reference || item.dateTime) && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
                      {item.amount ? (
                        <div>
                          <dt className="text-slate-400">{t("reviewQueue.row.amount")}</dt>
                          <dd className="font-medium text-ink">THB {item.amount}</dd>
                        </div>
                      ) : null}
                      {item.receiver ? (
                        <div>
                          <dt className="text-slate-400">{t("reviewQueue.row.receiver")}</dt>
                          <dd className="truncate font-medium text-ink">{item.receiver}</dd>
                        </div>
                      ) : null}
                      {item.reference ? (
                        <div>
                          <dt className="text-slate-400">{t("reviewQueue.row.reference")}</dt>
                          <dd className="truncate font-mono font-medium text-ink">{item.reference}</dd>
                        </div>
                      ) : null}
                      {item.dateTime ? (
                        <div>
                          <dt className="text-slate-400">{t("reviewQueue.row.dateTime")}</dt>
                          <dd className="font-medium text-ink">{item.dateTime}</dd>
                        </div>
                      ) : null}
                    </dl>
                  )}

                  {item.matchedFilename ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {t("reviewQueue.row.matchedWith")}{" "}
                      <span className="font-medium text-slate-700">{item.matchedFilename}</span>
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {t("reviewQueue.row.reason")} <span className="font-medium text-slate-700">{item.reasonSummary}</span>
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Link
                  href={item.reviewHref}
                  className="inline-flex items-center justify-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
                >
                  {t("reviewQueue.actions.compareReview")}
                </Link>
                <Link
                  href={`/documents/${item.documentId}`}
                  className="inline-flex items-center justify-center rounded-md border border-line bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
                >
                  {t("reviewQueue.actions.fullDetail")}
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
