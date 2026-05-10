import type { DuplicateStatus, ReviewStatus } from "@/lib/models";

export type DocumentReviewFilter = "all" | "pending" | "confirmed-duplicate" | "confirmed-distinct";

export function formatDuplicateStatus(status: DuplicateStatus) {
  const labels: Record<DuplicateStatus, string> = {
    NOT_CHECKED: "Not checked",
    PENDING: "Checking",
    NEW: "New upload",
    EXACT_DUPLICATE: "Exact duplicate",
    LIKELY_DUPLICATE: "Likely duplicate",
    DUPLICATE: "Duplicate",
    POSSIBLE_DUPLICATE: "Possible duplicate",
    ERROR: "Check failed"
  };

  return labels[status];
}

export function formatReviewStatus(status: ReviewStatus) {
  const labels: Record<ReviewStatus, string> = {
    NOT_REQUIRED: "Not required",
    PENDING: "Pending review",
    CONFIRMED_DUPLICATE: "Confirmed duplicate",
    CONFIRMED_DISTINCT: "Confirmed distinct"
  };

  return labels[status];
}

export function formatQualityStatus(status: "PASS" | "WARN" | "FAIL") {
  const labels: Record<"PASS" | "WARN" | "FAIL", string> = {
    PASS: "Good",
    WARN: "Needs attention",
    FAIL: "Unusable"
  };

  return labels[status];
}
