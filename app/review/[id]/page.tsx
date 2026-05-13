import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewActions } from "@/components/review-actions";
import { getDocumentForUser, getReviewQueueForUser } from "@/lib/documents";
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
  REVIEW_FIELD_LABELS,
  type ReviewFieldKey
} from "@/lib/review-helpers";
import { requireUser } from "@/lib/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatSimilarity(score: number | null) {
  if (score === null) return "—";
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
  bLow
}: {
  label: string;
  aValue: string | null;
  bValue: string | null;
  aConf: string | null;
  bConf: string | null;
  aLow: boolean;
  bLow: boolean;
}) {
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
                LOW CONF
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
        {aConf && <span className="ml-1 text-[10px] text-slate-400">({aConf})</span>}
      </td>
      <td className="py-2 pr-3 text-xs">
        {bValue ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-ink">{bValue}</span>
            {bLow ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                LOW CONF
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
        {bConf && <span className="ml-1 text-[10px] text-slate-400">({bConf})</span>}
      </td>
      <td className="py-2 pr-3">
        {!match && aValue !== null && bValue !== null ? (
          <span className="inline-block rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
            differs
          </span>
        ) : match && aValue !== null ? (
          <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            match
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
          ← Review queue
        </Link>
        <span className="text-slate-300">/</span>
        <span className="truncate text-sm text-slate-500">{document.originalFilename}</span>
      </div>

      {queueNavigation ? (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-ink">
              {queueNavigation.position !== null
                ? `Item ${queueNavigation.position} of ${queueNavigation.total}`
                : "Queue position unavailable"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Queue context is preserved from the current search, sort, and page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {queueNavigation.previousHref ? (
              <Link
                className="rounded-md border border-line bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
                href={queueNavigation.previousHref}
              >
                Previous item
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400">
                Start of queue
              </span>
            )}
            {queueNavigation.nextHref ? (
              <Link
                className="rounded-md border border-line bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
                href={queueNavigation.nextHref}
              >
                Next item
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500">
                End of queue
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* Status banner */}
      {alreadyReviewed ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          This item has already been reviewed:{" "}
          <strong>
            {document.reviewStatus === "CONFIRMED_DUPLICATE" ? "Confirmed duplicate" : "Confirmed distinct"}
          </strong>.
        </div>
      ) : canReview ? (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <strong>Pending review</strong> — visual similarity{" "}
          {formatSimilarity(document.similarityScore)}. Compare the images and structured fields, then record your decision below.
        </div>
      ) : null}

      {/* Image compare */}
      <div className="grid gap-4 md:grid-cols-2">
        <figure className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <figcaption className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="truncate text-sm font-medium text-ink">{document.originalFilename}</span>
            <Link
              href={`/documents/${String(document._id)}`}
              className="ml-2 shrink-0 text-xs text-accent hover:text-accent-dark"
            >
              Full detail
            </Link>
          </figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="max-h-[480px] w-full object-contain"
            src={`/api/documents/${String(document._id)}/original`}
            alt="Current document image"
          />
        </figure>

        <figure className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <figcaption className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="truncate text-sm font-medium text-ink">
              {matchedDocument ? matchedDocument.originalFilename : "Matched document"}
            </span>
            {matchedDocument && (
              <Link
                href={`/documents/${String(matchedDocument._id)}`}
                className="ml-2 shrink-0 text-xs text-accent hover:text-accent-dark"
              >
                Full detail
              </Link>
            )}
          </figcaption>
          {matchedDocument ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="max-h-[480px] w-full object-contain"
              src={`/api/documents/${String(matchedDocument._id)}/original`}
              alt="Matched document image"
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              Matched document not available
            </div>
          )}
        </figure>
      </div>

      {/* Field comparison table */}
      {matchedDocument && (
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <div className="border-b border-line px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Structured field comparison</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              OCR-derived only; not bank-verified. Low-confidence values are shown with LOW CONF.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="field-comparison-table">
              <thead>
                <tr className="border-b border-line bg-slate-50">
                  <th className="py-2 pl-3 pr-4 text-xs font-medium text-slate-500">Field</th>
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
                      label={REVIEW_FIELD_LABELS[key]}
                      aValue={aField.value}
                      bValue={bField.value}
                      aConf={aField.confidence}
                      bConf={bField.confidence}
                      aLow={aField.isLowConfidence}
                      bLow={bField.isLowConfidence}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review actions */}
      {canReview && (
        <div className="mt-4">
          <ReviewActions documentId={String(document._id)} nextHref={queueNavigation?.saveAndNextHref ?? null} />
        </div>
      )}

      {alreadyReviewed && (
        <div className="mt-4 rounded-lg border border-line bg-white p-4 text-sm text-slate-600">
          Review recorded on {document.reviewedAt ? formatDate(document.reviewedAt) : "unknown date"}.{" "}
          <Link href={`/documents/${String(document._id)}`} className="font-medium text-accent hover:text-accent-dark">
            View full detail →
          </Link>
        </div>
      )}

      {!canReview && !alreadyReviewed && (
        <div className="mt-4 rounded-lg border border-line bg-slate-50 p-4 text-sm text-slate-600">
          Review actions are not available for this document.{" "}
          <Link href={`/documents/${String(document._id)}`} className="font-medium text-accent hover:text-accent-dark">
            View full detail →
          </Link>
        </div>
      )}
    </section>
  );
}
