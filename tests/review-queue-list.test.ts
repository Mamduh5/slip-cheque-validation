import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReviewQueueList, type ReviewQueueListItem } from "../components/review-queue-list";
import { translate } from "../lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

const item: ReviewQueueListItem = {
  documentId: "doc-1",
  reviewHref: "/review/doc-1",
  filename: "slip.jpg",
  uploadedAt: "13 May 2026, 10:00",
  amount: "500.00",
  receiver: "Receiver Name",
  reference: "REF-123",
  dateTime: "2026-05-13 10:00",
  similarityLabel: translate("th", "reviewQueue.row.similar", { percent: 97 }),
  matchedFilename: "matched.jpg",
  reasonSummary: translate("th", "reviewQueue.row.imageSimilarityOnly")
};

describe("ReviewQueueList", () => {
  it("renders queue row and bulk chrome in Thai", () => {
    const markup = renderToStaticMarkup(createElement(ReviewQueueList, { items: [item], locale: "th" }));

    expect(markup).toContain(translate("th", "reviewQueue.actions.selectAllOnPage"));
    expect(markup).toContain(translate("th", "reviewQueue.actions.clearSelection"));
    expect(markup).toContain(translate("th", "reviewQueue.row.likelyDuplicate"));
    expect(markup).toContain(translate("th", "reviewQueue.row.amount"));
    expect(markup).toContain(translate("th", "reviewQueue.actions.compareReview"));
    expect(markup).toContain("slip.jpg");
    expect(markup).toContain("REF-123");
  });
});
