import { describe, expect, it } from "vitest";
import {
  buildReviewCompareUrl,
  buildReviewQueueUrl,
  parseReviewQueuePage,
  parseReviewQueueSort
} from "../lib/review-queue-context";

describe("review queue context", () => {
  it("parses sort and page defensively", () => {
    expect(parseReviewQueueSort("highest-similarity")).toBe("highest-similarity");
    expect(parseReviewQueueSort("unexpected")).toBe("newest");
    expect(parseReviewQueuePage("3")).toBe(3);
    expect(parseReviewQueuePage("-1")).toBe(1);
    expect(parseReviewQueuePage("abc")).toBe(1);
  });

  it("keeps default queue URLs compact", () => {
    expect(buildReviewQueueUrl({ q: "", sort: "newest", page: 1 })).toBe("/review");
    expect(buildReviewCompareUrl({ documentId: "doc-1", q: "", sort: "newest", page: 1 })).toBe("/review/doc-1");
  });

  it("preserves search, sort, and page on queue and compare URLs", () => {
    const context = { q: "ref 500", sort: "lowest-similarity" as const, page: 4 };

    expect(buildReviewQueueUrl(context)).toBe("/review?q=ref+500&sort=lowest-similarity&page=4");
    expect(buildReviewCompareUrl({ ...context, documentId: "doc-2" })).toBe(
      "/review/doc-2?q=ref+500&sort=lowest-similarity&page=4"
    );
  });
});
