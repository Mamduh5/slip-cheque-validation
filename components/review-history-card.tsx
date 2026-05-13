import type { ReviewHistoryEntry } from "@/lib/documents";

function formatHistoryDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function ReviewHistoryItem({ entry, compact = false }: { entry: ReviewHistoryEntry; compact?: boolean }) {
  return (
    <li className={compact ? "border-t border-line pt-3" : ""}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-sm font-medium text-ink">{entry.actionLabel}</p>
        <p className="text-xs text-slate-500">{formatHistoryDate(entry.reviewedAt)}</p>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        {entry.actorUserId ? <span>Actor: {entry.actorUserId}</span> : null}
        {entry.bulkReviewBatchId ? <span>Bulk review batch</span> : null}
      </div>
      {entry.note ? (
        <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {entry.note}
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-400">No review note.</p>
      )}
    </li>
  );
}

export function ReviewHistoryCard({ entries }: { entries: ReviewHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-line bg-white p-4 shadow-sm" data-testid="review-history-card">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Review history</p>
        <p className="mt-2 text-sm text-slate-600">
          No review actions have been recorded for this document yet.
        </p>
      </div>
    );
  }

  const [latest, ...older] = entries;

  return (
    <div className="mt-4 rounded-lg border border-line bg-white p-4 shadow-sm" data-testid="review-history-card">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Review history</p>
        {older.length > 0 ? <p className="text-xs text-slate-400">{entries.length} recent actions</p> : null}
      </div>
      <ol className="mt-3 space-y-3">
        <ReviewHistoryItem entry={latest} />
      </ol>
      {older.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-accent hover:text-accent-dark">
            Show earlier review actions
          </summary>
          <ol className="mt-3 space-y-3">
            {older.map((entry) => (
              <ReviewHistoryItem
                compact
                entry={entry}
                key={`${entry.reviewedAt.toISOString()}-${entry.action}-${entry.bulkReviewBatchId ?? "single"}`}
              />
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
