import { describe, expect, it } from "vitest";
import { buildBatchOutcome, formatBatchSummary, summarizeBatch } from "../lib/batch-upload";

describe("batch upload summaries", () => {
  it("labels staged upload progress without percentages", () => {
    expect(buildBatchOutcome({ status: "waiting" })).toMatchObject({
      label: "Waiting",
      retryable: false
    });
    expect(buildBatchOutcome({ status: "uploading" })).toMatchObject({
      label: "Uploading",
      description: "Sending the image."
    });
    expect(buildBatchOutcome({ status: "processing" })).toMatchObject({
      label: "Processing",
      description: "Checking quality and duplicates."
    });
  });

  it("labels compact completed outcomes", () => {
    expect(
      buildBatchOutcome({ status: "completed", duplicateStatus: "EXACT_DUPLICATE", reviewStatus: "NOT_REQUIRED" })
    ).toMatchObject({
      key: "exactDuplicate",
      label: "Exact duplicate found"
    });

    expect(
      buildBatchOutcome({ status: "completed", duplicateStatus: "LIKELY_DUPLICATE", reviewStatus: "PENDING" })
    ).toMatchObject({
      key: "reviewNeeded",
      label: "Likely duplicate - review needed"
    });

    expect(
      buildBatchOutcome({ status: "completed", duplicateStatus: "NEW", duplicateDecisionType: "SUPPRESSED_NEAR_DUPLICATE" })
    ).toMatchObject({
      key: "suppressed",
      label: "Near-duplicate review suppressed"
    });

    expect(buildBatchOutcome({ status: "completed", duplicateStatus: "NEW", reviewStatus: "NOT_REQUIRED" })).toMatchObject({
      key: "newUpload",
      label: "New upload"
    });
  });

  it("keeps quality rejection distinct from generic failure and makes both retryable", () => {
    expect(buildBatchOutcome({ status: "rejected", qualityStatus: "FAIL", error: "too small" })).toMatchObject({
      key: "qualityRejected",
      label: "Image rejected due to quality issues",
      retryable: true
    });

    expect(buildBatchOutcome({ status: "failed", error: "network error" })).toMatchObject({
      key: "failed",
      label: "Upload failed",
      retryable: true
    });
  });

  it("counts mixed batch outcomes for the grouped summary", () => {
    const counts = summarizeBatch([
      { status: "completed", duplicateStatus: "EXACT_DUPLICATE", reviewStatus: "NOT_REQUIRED" },
      { status: "completed", duplicateStatus: "LIKELY_DUPLICATE", reviewStatus: "PENDING" },
      { status: "completed", duplicateStatus: "NEW", reviewStatus: "NOT_REQUIRED" },
      { status: "completed", duplicateStatus: "NEW", duplicateDecisionType: "SUPPRESSED_NEAR_DUPLICATE" },
      { status: "rejected", qualityStatus: "FAIL", error: "too small" },
      { status: "failed", error: "network error" }
    ]);

    expect(counts).toEqual({
      total: 6,
      completed: 4,
      exactDuplicates: 1,
      reviewNeeded: 1,
      newUploads: 1,
      suppressed: 1,
      rejected: 1,
      failed: 1
    });
    expect(formatBatchSummary(counts)).toEqual([
      "6 files in batch",
      "4 completed",
      "1 exact duplicate",
      "1 need review",
      "1 new upload",
      "1 suppressed near-duplicate",
      "1 quality rejected",
      "1 failed"
    ]);
  });

  it("does not use bank/provider verification wording", () => {
    const text = [
      buildBatchOutcome({ status: "completed", duplicateStatus: "NEW", reviewStatus: "NOT_REQUIRED" }).label,
      buildBatchOutcome({ status: "completed", duplicateStatus: "LIKELY_DUPLICATE", reviewStatus: "PENDING" }).description,
      formatBatchSummary(summarizeBatch([{ status: "completed", duplicateStatus: "NEW" }])).join(" ")
    ]
      .join(" ")
      .toLowerCase();

    for (const forbidden of ["verified payment", "confirmed transfer", "bank truth", "provider truth", "authenticity"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});

