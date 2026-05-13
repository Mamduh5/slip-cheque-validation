import type { ReviewHistoryEntry } from "@/lib/documents";
import { createTranslator, type SupportedLocale } from "@/lib/i18n";

function formatHistoryDate(date: Date, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function reviewActionLabel(entry: ReviewHistoryEntry, locale: SupportedLocale) {
  const t = createTranslator(locale);
  return entry.action === "CONFIRMED_DUPLICATE"
    ? t("statuses.review.CONFIRMED_DUPLICATE")
    : t("statuses.review.CONFIRMED_DISTINCT");
}

function ReviewHistoryItem({
  entry,
  compact = false,
  locale
}: {
  entry: ReviewHistoryEntry;
  compact?: boolean;
  locale: SupportedLocale;
}) {
  const t = createTranslator(locale);

  return (
    <li className={compact ? "border-t border-line pt-3" : ""}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-sm font-medium text-ink">{reviewActionLabel(entry, locale)}</p>
        <p className="text-xs text-slate-500">{formatHistoryDate(entry.reviewedAt, locale)}</p>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        {entry.actorUserId ? <span>{t("reviewHistory.actor", { actor: entry.actorUserId })}</span> : null}
        {entry.bulkReviewBatchId ? <span>{t("reviewHistory.bulkBatch")}</span> : null}
      </div>
      {entry.note ? (
        <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {entry.note}
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-400">{t("reviewHistory.noNote")}</p>
      )}
    </li>
  );
}

export function ReviewHistoryCard({ entries, locale = "en" }: { entries: ReviewHistoryEntry[]; locale?: SupportedLocale }) {
  const t = createTranslator(locale);

  if (entries.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-line bg-white p-4 shadow-sm" data-testid="review-history-card">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("reviewHistory.title")}</p>
        <p className="mt-2 text-sm text-slate-600">
          {t("reviewHistory.empty")}
        </p>
      </div>
    );
  }

  const [latest, ...older] = entries;

  return (
    <div className="mt-4 rounded-lg border border-line bg-white p-4 shadow-sm" data-testid="review-history-card">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("reviewHistory.title")}</p>
        {older.length > 0 ? <p className="text-xs text-slate-400">{t("reviewHistory.recentActions", { count: entries.length })}</p> : null}
      </div>
      <ol className="mt-3 space-y-3">
        <ReviewHistoryItem entry={latest} locale={locale} />
      </ol>
      {older.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-accent hover:text-accent-dark">
            {t("reviewHistory.showEarlier")}
          </summary>
          <ol className="mt-3 space-y-3">
            {older.map((entry) => (
              <ReviewHistoryItem
                compact
                entry={entry}
                locale={locale}
                key={`${entry.reviewedAt.toISOString()}-${entry.action}-${entry.bulkReviewBatchId ?? "single"}`}
              />
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
