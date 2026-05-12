import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReviewHistoryCard } from "../components/review-history-card";
import type { ReviewHistoryEntry } from "../lib/documents";

function makeEntry(overrides: Partial<ReviewHistoryEntry> = {}): ReviewHistoryEntry {
  return {
    action: "CONFIRMED_DUPLICATE",
    actionLabel: "Confirmed duplicate",
    reviewedAt: new Date("2026-05-12T10:00:00.000Z"),
    note: "Same visible reference.",
    actorUserId: "user-1",
    matchedDocumentId: "matched-1",
    bulkReviewBatchId: null,
    ...overrides
  };
}

describe("ReviewHistoryCard", () => {
  it("renders the latest review note compactly", () => {
    const markup = renderToStaticMarkup(createElement(ReviewHistoryCard, { entries: [makeEntry()] }));

    expect(markup).toContain("Review history");
    expect(markup).toContain("Confirmed duplicate");
    expect(markup).toContain("Same visible reference.");
    expect(markup).toContain("Actor: user-1");
  });

  it("keeps older entries behind a lightweight disclosure", () => {
    const markup = renderToStaticMarkup(
      createElement(ReviewHistoryCard, {
        entries: [
          makeEntry({ note: "Latest note." }),
          makeEntry({
            action: "CONFIRMED_DISTINCT",
            actionLabel: "Confirmed distinct",
            reviewedAt: new Date("2026-05-11T10:00:00.000Z"),
            note: null,
            bulkReviewBatchId: "batch-1"
          })
        ]
      })
    );

    expect(markup).toContain("Latest note.");
    expect(markup).toContain("Show earlier review actions");
    expect(markup).toContain("Confirmed distinct");
    expect(markup).toContain("No review note.");
    expect(markup).toContain("Bulk review batch");
  });
});
