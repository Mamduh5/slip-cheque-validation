import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewActions } from "@/components/review-actions";
import { getDocumentForUser, getReviewQueueForUser } from "@/lib/documents";
import { createTranslator, type SupportedLocale, type TranslationKey } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import {
  buildReviewCompareUrl,
  buildReviewQueueUrl,
  parseReviewQueuePage,
  parseReviewQueueSort,
  type ReviewQueueContext
} from "@/lib/review-queue-context";
import {
  getReviewFieldDisplayValue,
  reviewValuesMatch,
  type ReviewFieldKey
} from "@/lib/review-helpers";
import { requireUser } from "@/lib/session";

const reviewFieldLabelKeys: Record<ReviewFieldKey, TranslationKey> = {
  amount: "reviewQueue.row.amount",
  receiverName: "reviewQueue.row.receiver",
  senderName: "reviewQueue.row.sender",
  dateTime: "reviewQueue.row.dateTime",
  transactionReference: "reviewQueue.row.reference"
};

function formatDate(date: Date, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatSimilarity(score: number | null, locale: SupportedLocale) {
  if (score === null) return createTranslator(locale)("reviewCompare.notAvailable");
  return `${Math.round(score * 100)}%`;
}

async function getQueueNavigation(input: {
  userId: string;
  documentId: string;
  context: ReviewQueueContext;
}) {
  const queue = await getReviewQueueForUser(input.userId, {
    searchQuery: input.context.q,
    sort: input.context.sort,
    page: input.context.page,
    pageSize: 10
  });
  const currentIndex = queue.items.findIndex((item) => String(item.document._id) === input.documentId);

  if (currentIndex === -1) {
    return {
      total: queue.total,
      position: null,
      previousHref: null,
      nextHref: null,
      saveAndNextHref: null
    };
  }

  const previousFromCurrentPage = currentIndex > 0 ? queue.items[currentIndex - 1] : null;
  const nextFromCurrentPage = currentIndex < queue.items.length - 1 ? queue.items[currentIndex + 1] : null;
  const [previousPageQueue, nextPageQueue] = await Promise.all([
    previousFromCurrentPage === null && queue.page > 1
      ? getReviewQueueForUser(input.userId, {
          searchQuery: input.context.q,
          sort: input.context.sort,
          page: queue.page - 1,
          pageSize: queue.pageSize
        })
      : null,
    nextFromCurrentPage === null && queue.page < queue.totalPages
      ? getReviewQueueForUser(input.userId, {
          searchQuery: input.context.q,
          sort: input.context.sort,
          page: queue.page + 1,
          pageSize: queue.pageSize
        })
      : null
  ]);

  const previousItem =
    previousFromCurrentPage ?? previousPageQueue?.items[previousPageQueue.items.length - 1] ?? null;
  const nextItem = nextFromCurrentPage ?? nextPageQueue?.items[0] ?? null;
  const previousPage = previousFromCurrentPage ? queue.page : queue.page - 1;
  const nextPage = nextFromCurrentPage ? queue.page : queue.page + 1;
  const position = (queue.page - 1) * queue.pageSize + currentIndex + 1;

  return {
    total: queue.total,
    position,
    previousHref: previousItem
      ? buildReviewCompareUrl({
          ...input.context,
          documentId: String(previousItem.document._id),
          page: previousPage
        })
      : null,
    nextHref: nextItem
      ? buildReviewCompareUrl({
          ...input.context,
          documentId: String(nextItem.document._id),
          page: nextPage
        })
      : null,
    saveAndNextHref: nextItem
      ? buildReviewCompareUrl({
          ...input.context,
          documentId: String(nextItem.document._id),
          page: queue.page
        })
      : null
  };
}

function FieldRow({
  label,
  aValue,
  bValue,
  aConf,
  bConf,
  aLow,
  bLow,
  locale
}: {
  label: string;
  aValue: string | null;
  bValue: string | null;
  aConf: string | null;
  bConf: string | null;
  aLow: boolean;
  bLow: boolean;
  locale: SupportedLocale;
}) {
  const t = createTranslator(locale);
  const match = reviewValuesMatch(aValue, bValue);
  const hasBoth = aValue !== null || bValue !== null;
  if (!hasBoth) return null;

  const diffClass = !match && aValue !== null && bValue !== null ? "bg-orange-50" : "";

  return (
    <tr className={`border-t border-line ${diffClass}`}>
      <td className="py-2 pl-3 pr-4 text-xs font-medium text-slate-500">{label}</td>
      <td className="py-2 pr-3 text-xs">
        {aValue ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-ink">{aValue}</span>
            {aLow ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                {t("reviewCompare.lowConfidence")}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-slate-400">{t("reviewCompare.notAvailable")}</span>
        )}
        {aConf && <span className="ml-1 text-[10px] text-slate-400">({aConf})</span>}
      </td>
      <td className="py-2 pr-3 text-xs">
        {bValue ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-ink">{bValue}</span>
            {bLow ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                {t("reviewCompare.lowConfidence")}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-slate-400">{t("reviewCompare.notAvailable")}</span>
        )}
        {bConf && <span className="ml-1 text-[10px] text-slate-400">({bConf})</span>}
      </td>
      <td className="py-2 pr-3">
        {!match && aValue !== null && bValue !== null ? (
          <span className="inline-block rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
            {t("reviewCompare.differs")}
          </span>
        ) : match && aValue !== null ? (
          <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            {t("reviewCompare.match")}
          </span>
        ) : null}
      </td>
    </tr>
  );
}

export default async function ReviewComparePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const user = await requireUser();
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const queueContext: ReviewQueueContext = {
    q: (resolvedSearchParams?.q ?? "").trim(),
    sort: parseReviewQueueSort(resolvedSearchParams?.sort),
    page: parseReviewQueuePage(resolvedSearchParams?.page)
  };
  const document = await getDocumentForUser(id, user.id);

  if (!document) {
    notFound();
  }

  if (document.duplicateStatus !== "LIKELY_DUPLICATE") {
    notFound();
  }

  const matchedDocument =
    document.matchedDocumentId !== null
      ? await getDocumentForUser(document.matchedDocumentId, user.id)
      : null;

  const canReview = document.reviewStatus === "PENDING" && matchedDocument !== null;
  const alreadyReviewed = document.reviewStatus !== "PENDING" && document.reviewStatus !== "NOT_REQUIRED";
  const queueHref = buildReviewQueueUrl(queueContext);
  const queueNavigation = canReview
    ? await getQueueNavigation({
        userId: user.id,
        documentId: String(document._id),
        context: queueContext
      })
    : null;

  const fieldKeys: ReviewFieldKey[] = ["amount", "receiverName", "senderName", "dateTime", "transactionReference"];

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-center gap-3">
        <Link
          className="text-sm font-medium text-accent hover:text-accent-dark"
          href={queueHref}
        >
          {t("reviewCompare.backToQueue")}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="truncate text-sm text-slate-500">{document.originalFilename}</span>
      </div>

      {queueNavigation ? (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-ink">
              {queueNavigation.position !== null
                ? t("reviewCompare.itemPosition", { position: queueNavigation.position, total: queueNavigation.total })
                : t("reviewCompare.positionUnavailable")}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("reviewCompare.contextPreserved")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {queueNavigation.previousHref ? (
              <Link
                className="rounded-md border border-line bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
                href={queueNavigation.previousHref}
              >
                {t("reviewCompare.previousItem")} <span className="ml-1 text-xs text-slate-400">{t("reviewCompare.leftArrow")}</span>
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400">
                {t("reviewCompare.startOfQueue")} <span className="ml-1 text-xs">{t("reviewCompare.leftArrow")}</span>
              </span>
            )}
            {queueNavigation.nextHref ? (
              <Link
                className="rounded-md border border-line bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
                href={queueNavigation.nextHref}
              >
                {t("reviewCompare.nextItem")} <span className="ml-1 text-xs text-slate-400">{t("reviewCompare.rightArrow")}</span>
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500">
                {t("reviewCompare.endOfQueue")} <span className="ml-1 text-xs">{t("reviewCompare.rightArrow")}</span>
              </span>
            )}
          </div>
        </div>
      ) : null}

      {alreadyReviewed ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {t("reviewCompare.alreadyReviewed")}{" "}
          <strong>
            {document.reviewStatus === "CONFIRMED_DUPLICATE"
              ? t("statuses.review.CONFIRMED_DUPLICATE")
              : t("statuses.review.CONFIRMED_DISTINCT")}
          </strong>.
        </div>
      ) : canReview ? (
        <div className="mb-4 rounded-lg border border-line bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <strong>{t("reviewCompare.pendingReview")}</strong> -{" "}
          {t("reviewCompare.pendingReviewText", { similarity: formatSimilarity(document.similarityScore, locale) })}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <figure className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <figcaption className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="truncate text-sm font-medium text-ink">{document.originalFilename}</span>
            <Link
              href={`/documents/${String(document._id)}`}
              className="ml-2 shrink-0 text-xs text-accent hover:text-accent-dark"
            >
              {t("reviewCompare.fullDetail")}
            </Link>
          </figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="max-h-[480px] w-full object-contain"
            src={`/api/documents/${String(document._id)}/original`}
            alt={t("reviewCompare.currentImageAlt")}
          />
        </figure>

        <figure className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <figcaption className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="truncate text-sm font-medium text-ink">
              {matchedDocument ? matchedDocument.originalFilename : t("reviewCompare.matchedDocument")}
            </span>
            {matchedDocument && (
              <Link
                href={`/documents/${String(matchedDocument._id)}`}
                className="ml-2 shrink-0 text-xs text-accent hover:text-accent-dark"
              >
                {t("reviewCompare.fullDetail")}
              </Link>
            )}
          </figcaption>
          {matchedDocument ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="max-h-[480px] w-full object-contain"
              src={`/api/documents/${String(matchedDocument._id)}/original`}
              alt={t("reviewCompare.matchedImageAlt")}
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              {t("reviewCompare.matchedUnavailable")}
            </div>
          )}
        </figure>
      </div>

      {matchedDocument && (
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <div className="border-b border-line px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("reviewCompare.fieldComparison")}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {t("reviewCompare.fieldComparisonHelper")}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="field-comparison-table">
              <thead>
                <tr className="border-b border-line bg-slate-50">
                  <th className="py-2 pl-3 pr-4 text-xs font-medium text-slate-500">{t("reviewCompare.field")}</th>
                  <th className="py-2 pr-3 text-xs font-medium text-slate-500 max-w-[36%] truncate">
                    {document.originalFilename}
                  </th>
                  <th className="py-2 pr-3 text-xs font-medium text-slate-500 max-w-[36%] truncate">
                    {matchedDocument.originalFilename}
                  </th>
                  <th className="py-2 pr-3 text-xs font-medium text-slate-500"></th>
                </tr>
              </thead>
              <tbody>
                {fieldKeys.map((key) => {
                  const aField = getReviewFieldDisplayValue(document, key);
                  const bField = getReviewFieldDisplayValue(matchedDocument, key);
                  return (
                    <FieldRow
                      key={key}
                      label={t(reviewFieldLabelKeys[key])}
                      aValue={aField.value}
                      bValue={bField.value}
                      aConf={aField.confidence}
                      bConf={bField.confidence}
                      aLow={aField.isLowConfidence}
                      bLow={bField.isLowConfidence}
                      locale={locale}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canReview && (
        <div className="mt-4">
          <ReviewActions
            documentId={String(document._id)}
            enableShortcuts
            nextHref={queueNavigation?.saveAndNextHref ?? null}
            queueNextHref={queueNavigation?.nextHref ?? null}
            queuePreviousHref={queueNavigation?.previousHref ?? null}
            locale={locale}
          />
        </div>
      )}

      {alreadyReviewed && (
        <div className="mt-4 rounded-lg border border-line bg-white p-4 text-sm text-slate-600">
          {t("reviewCompare.recordedOn", {
            date: document.reviewedAt ? formatDate(document.reviewedAt, locale) : t("reviewCompare.unknownDate")
          })}{" "}
          <Link href={`/documents/${String(document._id)}`} className="font-medium text-accent hover:text-accent-dark">
            {t("reviewCompare.viewFullDetail")}
          </Link>
        </div>
      )}

      {!canReview && !alreadyReviewed && (
        <div className="mt-4 rounded-lg border border-line bg-slate-50 p-4 text-sm text-slate-600">
          {t("reviewCompare.actionsUnavailable")}{" "}
          <Link href={`/documents/${String(document._id)}`} className="font-medium text-accent hover:text-accent-dark">
            {t("reviewCompare.viewFullDetail")}
          </Link>
        </div>
      )}
    </section>
  );
}
