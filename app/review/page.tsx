import Link from "next/link";
import { ReviewQueueList, type ReviewQueueListItem } from "@/components/review-queue-list";
import { WorkflowPresetRow } from "@/components/workflow-preset-row";
import { getReviewQueueForUser, type ReviewQueueSort } from "@/lib/documents";
import { reasonCodeToLabel } from "@/lib/document-result-summary";
import { createTranslator, type SupportedLocale, type TranslationKey } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import {
  buildReviewCompareUrl,
  buildReviewQueueUrl,
  parseReviewQueuePage,
  parseReviewQueueSort
} from "@/lib/review-queue-context";
import { resolveActiveReviewPreset, reviewPresetHref, reviewPresets } from "@/lib/workflow-presets";
import { requireUser } from "@/lib/session";
import type { DocumentRecord } from "@/lib/models";

function formatDate(date: Date, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatSimilarity(score: number | null, locale: SupportedLocale) {
  if (score === null) return null;
  return createTranslator(locale)("reviewQueue.row.similar", { percent: Math.round(score * 100) });
}

function getKeyField(doc: DocumentRecord, field: "amount" | "receiverName" | "transactionReference" | "dateTime") {
  const f = doc.slipImageRead?.extractedFields?.[field];
  if (!f?.value) return null;
  return f.value;
}

function getReasonSummary(document: DocumentRecord, locale: SupportedLocale) {
  if (document.duplicateDecisionReasons.length === 0) {
    return createTranslator(locale)("reviewQueue.row.imageSimilarityOnly");
  }

  const labels = document.duplicateDecisionReasons.map((reason) => reasonCodeToLabel(reason, locale));
  if (labels.length <= 2) return labels.join(", ");
  return `${labels[0]}, ${labels[1]}+`;
}

const reviewPresetLabelKeys: Record<string, { label: TranslationKey; description: TranslationKey }> = {
  "needs-review": {
    label: "workflowPresets.review.needsReview.label",
    description: "workflowPresets.review.needsReview.description"
  },
  "strongest-matches": {
    label: "workflowPresets.review.strongestMatches.label",
    description: "workflowPresets.review.strongestMatches.description"
  },
  "hardest-cases": {
    label: "workflowPresets.review.hardestCases.label",
    description: "workflowPresets.review.hardestCases.description"
  },
  "oldest-first": {
    label: "workflowPresets.review.oldestFirst.label",
    description: "workflowPresets.review.oldestFirst.description"
  }
};

function buildReviewExportUrl(params: { q: string; sort: ReviewQueueSort }) {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.sort !== "newest") searchParams.set("sort", params.sort);
  const query = searchParams.toString();
  return query ? `/api/exports/review?${query}` : "/api/exports/review";
}

function toReviewQueueListItem({
  document,
  matchedDocument,
  reviewHref,
  locale
}: {
  document: DocumentRecord;
  matchedDocument: DocumentRecord | null;
  reviewHref: string;
  locale: SupportedLocale;
}): ReviewQueueListItem {
  return {
    documentId: String(document._id),
    reviewHref,
    filename: document.originalFilename,
    uploadedAt: formatDate(document.createdAt, locale),
    amount: getKeyField(document, "amount"),
    receiver: getKeyField(document, "receiverName"),
    reference: getKeyField(document, "transactionReference"),
    dateTime: getKeyField(document, "dateTime"),
    similarityLabel: formatSimilarity(document.similarityScore, locale),
    matchedFilename: matchedDocument?.originalFilename ?? null,
    reasonSummary: getReasonSummary(document, locale)
  };
}

export default async function ReviewQueuePage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const user = await requireUser();
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const resolvedSearchParams = await searchParams;
  const searchQuery = (resolvedSearchParams?.q ?? "").trim();
  const sort = parseReviewQueueSort(resolvedSearchParams?.sort);
  const page = parseReviewQueuePage(resolvedSearchParams?.page);
  const queue = await getReviewQueueForUser(user.id, { searchQuery, sort, page, pageSize: 10 });
  const hasSearchOrSort = searchQuery || sort !== "newest";
  const activePresetId = resolveActiveReviewPreset(sort);
  const exportHref = buildReviewExportUrl({ q: searchQuery, sort });

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold">{t("reviewQueue.title")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("reviewQueue.intro")}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
            href={exportHref}
          >
            {t("reviewQueue.actions.exportCsv")}
          </Link>
          <Link
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
            href="/dashboard"
          >
            {t("reviewQueue.actions.backToDashboard")}
          </Link>
        </div>
      </div>

      <WorkflowPresetRow
        label={t("workflowPresets.quickViews")}
        activePresetId={activePresetId}
        presets={reviewPresets.map((preset) => ({
          id: preset.id,
          label: t(reviewPresetLabelKeys[preset.id].label),
          description: t(reviewPresetLabelKeys[preset.id].description),
          href: reviewPresetHref(preset, { q: searchQuery })
        }))}
      />

      <form className="mb-4 rounded-lg border border-line bg-white p-3" action="/review">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="review-search">
          {t("reviewQueue.search.label")}
        </label>
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_220px_auto]">
          <input
            className="focus-ring rounded-md border border-line px-3 py-2 text-sm"
            id="review-search"
            name="q"
            defaultValue={searchQuery}
            placeholder={t("reviewQueue.search.placeholder")}
          />
          <select
            className="rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-700"
            name="sort"
            defaultValue={sort}
          >
            <option value="newest">{t("reviewQueue.sort.newest")}</option>
            <option value="oldest">{t("reviewQueue.sort.oldest")}</option>
            <option value="highest-similarity">{t("reviewQueue.sort.highestSimilarity")}</option>
            <option value="lowest-similarity">{t("reviewQueue.sort.lowestSimilarity")}</option>
          </select>
          <button
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
            type="submit"
          >
            {t("reviewQueue.actions.apply")}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t("reviewQueue.search.extractedOnly")}</p>
        <p className="mt-1 text-xs text-slate-500">{t("reviewQueue.search.exportNote")}</p>
      </form>

      {queue.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink">{t("reviewQueue.empty.title")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {hasSearchOrSort ? t("reviewQueue.empty.filtered") : t("reviewQueue.empty.initial")}
          </p>
          {hasSearchOrSort ? (
            <Link className="mt-4 inline-flex rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:border-slate-400" href="/review">
              {t("reviewQueue.actions.clearSearch")}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">
            {t("reviewQueue.pagination.showing", {
              visible: queue.items.length,
              total: queue.total,
              itemLabel: t(queue.total === 1 ? "reviewQueue.pagination.itemOne" : "reviewQueue.pagination.itemOther")
            })}
          </p>
          <ReviewQueueList
            key={queue.items.map((item) => String(item.document._id)).join("|")}
            items={queue.items.map((item) =>
              toReviewQueueListItem({
                ...item,
                reviewHref: buildReviewCompareUrl({
                  documentId: String(item.document._id),
                  q: searchQuery,
                  sort,
                  page: queue.page
                }),
                locale
              })
            )}
            locale={locale}
          />
          {queue.totalPages > 1 ? (
            <nav className="mt-2 flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-sm">
              <Link
                className={`rounded-md border border-line px-3 py-1.5 ${
                  queue.page <= 1 ? "pointer-events-none text-slate-300" : "text-slate-700 hover:border-slate-400"
                }`}
                href={buildReviewQueueUrl({ q: searchQuery, sort, page: Math.max(1, queue.page - 1) })}
              >
                {t("reviewQueue.actions.previous")}
              </Link>
              <span className="text-slate-500">
                {t("reviewQueue.pagination.page", { page: queue.page, totalPages: queue.totalPages })}
              </span>
              <Link
                className={`rounded-md border border-line px-3 py-1.5 ${
                  queue.page >= queue.totalPages ? "pointer-events-none text-slate-300" : "text-slate-700 hover:border-slate-400"
                }`}
                href={buildReviewQueueUrl({ q: searchQuery, sort, page: Math.min(queue.totalPages, queue.page + 1) })}
              >
                {t("reviewQueue.actions.next")}
              </Link>
            </nav>
          ) : null}
        </div>
      )}
    </section>
  );
}
