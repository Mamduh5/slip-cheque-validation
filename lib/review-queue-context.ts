import type { ReviewQueueSort } from "@/lib/documents";

export interface ReviewQueueContext {
  q: string;
  sort: ReviewQueueSort;
  page: number;
}

export function parseReviewQueueSort(value: string | undefined | null): ReviewQueueSort {
  if (value === "oldest" || value === "highest-similarity" || value === "lowest-similarity") {
    return value;
  }

  return "newest";
}

export function parseReviewQueuePage(value: string | undefined | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function reviewQueueSearchParams(context: ReviewQueueContext) {
  const searchParams = new URLSearchParams();
  const searchQuery = context.q.trim();

  if (searchQuery) searchParams.set("q", searchQuery);
  if (context.sort !== "newest") searchParams.set("sort", context.sort);
  if (context.page > 1) searchParams.set("page", String(context.page));

  return searchParams;
}

export function buildReviewQueueUrl(context: ReviewQueueContext) {
  const query = reviewQueueSearchParams(context).toString();
  return query ? `/review?${query}` : "/review";
}

export function buildReviewCompareUrl(context: ReviewQueueContext & { documentId: string }) {
  const query = reviewQueueSearchParams(context).toString();
  return query ? `/review/${context.documentId}?${query}` : `/review/${context.documentId}`;
}
