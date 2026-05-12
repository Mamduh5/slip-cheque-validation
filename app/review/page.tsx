import Link from "next/link";
import { getReviewQueueForUser, type ReviewQueueSort } from "@/lib/documents";
import { reasonCodeToLabel } from "@/lib/document-result-summary";
import { requireUser } from "@/lib/session";
import type { DocumentRecord } from "@/lib/models";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatSimilarity(score: number | null) {
  if (score === null) return null;
  return `${Math.round(score * 100)}% similar`;
}

function getKeyField(doc: DocumentRecord, field: "amount" | "receiverName" | "transactionReference" | "dateTime") {
  const f = doc.slipImageRead?.extractedFields?.[field];
  if (!f?.value) return null;
  return f.value;
}

function getReasonSummary(document: DocumentRecord) {
  if (document.duplicateDecisionReasons.length === 0) {
    return "Image similarity only";
  }

  const labels = document.duplicateDecisionReasons.map(reasonCodeToLabel);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels[0]}, ${labels[1]}+`;
}

function parseSort(value: string | undefined): ReviewQueueSort {
  if (value === "oldest" || value === "highest-similarity" || value === "lowest-similarity") {
    return value;
  }

  return "newest";
}

function parsePage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function buildReviewUrl(params: { q: string; sort: ReviewQueueSort; page: number }) {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.sort !== "newest") searchParams.set("sort", params.sort);
  if (params.page > 1) searchParams.set("page", String(params.page));
  const query = searchParams.toString();
  return query ? `/review?${query}` : "/review";
}

function QueueCard({
  document,
  matchedDocument
}: {
  document: DocumentRecord;
  matchedDocument: DocumentRecord | null;
}) {
  const docId = String(document._id);
  const amount = getKeyField(document, "amount");
  const receiver = getKeyField(document, "receiverName");
  const reference = getKeyField(document, "transactionReference");
  const dateTime = getKeyField(document, "dateTime");

  const similarity = formatSimilarity(document.similarityScore);

  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-ink">{document.originalFilename}</span>
            <span className="inline-flex shrink-0 items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800">
              Likely duplicate
            </span>
            {similarity && (
              <span className="shrink-0 text-xs text-slate-500">{similarity}</span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">Uploaded {formatDate(document.createdAt)}</p>

          {(amount || receiver || reference || dateTime) && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
              {amount && (
                <div>
                  <dt className="text-slate-400">Amount</dt>
                  <dd className="font-medium text-ink">฿{amount}</dd>
                </div>
              )}
              {receiver && (
                <div>
                  <dt className="text-slate-400">Receiver</dt>
                  <dd className="truncate font-medium text-ink">{receiver}</dd>
                </div>
              )}
              {reference && (
                <div>
                  <dt className="text-slate-400">Reference</dt>
                  <dd className="truncate font-mono font-medium text-ink">{reference}</dd>
                </div>
              )}
              {dateTime && (
                <div>
                  <dt className="text-slate-400">Date / time</dt>
                  <dd className="font-medium text-ink">{dateTime}</dd>
                </div>
              )}
            </dl>
          )}

          {matchedDocument && (
            <p className="mt-2 text-xs text-slate-500">
              Matched with:{" "}
              <span className="font-medium text-slate-700">{matchedDocument.originalFilename}</span>
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Reason: <span className="font-medium text-slate-700">{getReasonSummary(document)}</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href={`/review/${docId}`}
            className="inline-flex items-center justify-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
          >
            Compare &amp; review
          </Link>
          <Link
            href={`/documents/${docId}`}
            className="inline-flex items-center justify-center rounded-md border border-line bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
          >
            Full detail
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function ReviewQueuePage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const searchQuery = (resolvedSearchParams?.q ?? "").trim();
  const sort = parseSort(resolvedSearchParams?.sort);
  const page = parsePage(resolvedSearchParams?.page);
  const queue = await getReviewQueueForUser(user.id, { searchQuery, sort, page, pageSize: 10 });
  const hasSearchOrSort = searchQuery || sort !== "newest";

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold">Review Queue</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Documents flagged as likely duplicates waiting for your review.
          </p>
        </div>
        <Link
          className="self-start rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 sm:self-auto"
          href="/dashboard"
        >
          Back to dashboard
        </Link>
      </div>

      <form className="mb-4 rounded-lg border border-line bg-white p-3" action="/review">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="review-search">
          Search review queue
        </label>
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_220px_auto]">
          <input
            className="focus-ring rounded-md border border-line px-3 py-2 text-sm"
            id="review-search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Amount, reference, receiver, sender, date"
          />
          <select
            className="rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-700"
            name="sort"
            defaultValue={sort}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest-similarity">Highest similarity first</option>
            <option value="lowest-similarity">Lowest similarity first</option>
          </select>
          <button
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
            type="submit"
          >
            Apply
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Search uses extracted fields only. Full OCR text is not searched here.</p>
      </form>

      {queue.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink">Queue is clear</h2>
          <p className="mt-1 text-sm text-slate-500">
            {hasSearchOrSort ? "No pending review items match the current search." : "No pending review items. New likely duplicates will appear here."}
          </p>
          {hasSearchOrSort ? (
            <Link className="mt-4 inline-flex rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:border-slate-400" href="/review">
              Clear search
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">
            Showing {queue.items.length} of {queue.total} item{queue.total === 1 ? "" : "s"} pending review
          </p>
          {queue.items.map(({ document, matchedDocument }) => (
            <QueueCard
              key={String(document._id)}
              document={document}
              matchedDocument={matchedDocument}
            />
          ))}
          {queue.totalPages > 1 ? (
            <nav className="mt-2 flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-sm">
              <Link
                className={`rounded-md border border-line px-3 py-1.5 ${
                  queue.page <= 1 ? "pointer-events-none text-slate-300" : "text-slate-700 hover:border-slate-400"
                }`}
                href={buildReviewUrl({ q: searchQuery, sort, page: Math.max(1, queue.page - 1) })}
              >
                Previous
              </Link>
              <span className="text-slate-500">
                Page {queue.page} of {queue.totalPages}
              </span>
              <Link
                className={`rounded-md border border-line px-3 py-1.5 ${
                  queue.page >= queue.totalPages ? "pointer-events-none text-slate-300" : "text-slate-700 hover:border-slate-400"
                }`}
                href={buildReviewUrl({ q: searchQuery, sort, page: Math.min(queue.totalPages, queue.page + 1) })}
              >
                Next
              </Link>
            </nav>
          ) : null}
        </div>
      )}
    </section>
  );
}
