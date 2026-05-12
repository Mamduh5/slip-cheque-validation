import type { DuplicateDecisionType, DuplicateStatus, QualityStatus, ReviewStatus } from "@/lib/models";

export type BatchUploadLifecycleStatus =
  | "waiting"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"
  | "rejected";

export type BatchOutcomeKey =
  | "waiting"
  | "uploading"
  | "processing"
  | "exactDuplicate"
  | "reviewNeeded"
  | "suppressed"
  | "newUpload"
  | "qualityRejected"
  | "failed";

export interface BatchOutcomeInput {
  status: BatchUploadLifecycleStatus;
  duplicateStatus?: DuplicateStatus;
  duplicateDecisionType?: DuplicateDecisionType | null;
  reviewStatus?: ReviewStatus;
  qualityStatus?: QualityStatus;
  error?: string | null;
}

export interface BatchOutcomeSummary {
  key: BatchOutcomeKey;
  label: string;
  description: string;
  tone: "neutral" | "positive" | "warning" | "info" | "danger";
  retryable: boolean;
}

export interface BatchSummaryCounts {
  total: number;
  completed: number;
  exactDuplicates: number;
  reviewNeeded: number;
  newUploads: number;
  suppressed: number;
  rejected: number;
  failed: number;
}

export function uploadLifecycleLabel(status: BatchUploadLifecycleStatus): string {
  switch (status) {
    case "waiting":
      return "Waiting";
    case "uploading":
      return "Uploading";
    case "processing":
      return "Processing";
    case "completed":
      return "Upload completed";
    case "rejected":
      return "Quality rejected";
    case "failed":
      return "Upload failed";
  }
}

export function buildBatchOutcome(input: BatchOutcomeInput): BatchOutcomeSummary {
  if (input.status === "waiting") {
    return {
      key: "waiting",
      label: "Waiting",
      description: "Ready to upload.",
      tone: "neutral",
      retryable: false
    };
  }

  if (input.status === "uploading") {
    return {
      key: "uploading",
      label: "Uploading",
      description: "Sending the image.",
      tone: "info",
      retryable: false
    };
  }

  if (input.status === "processing") {
    return {
      key: "processing",
      label: "Processing",
      description: "Checking quality and duplicates.",
      tone: "info",
      retryable: false
    };
  }

  if (input.status === "rejected" || input.qualityStatus === "FAIL") {
    return {
      key: "qualityRejected",
      label: "Image rejected due to quality issues",
      description: input.error ?? "Retake or choose a clearer image.",
      tone: "warning",
      retryable: true
    };
  }

  if (input.status === "failed") {
    return {
      key: "failed",
      label: "Upload failed",
      description: input.error ?? "Check the connection and try again.",
      tone: "danger",
      retryable: true
    };
  }

  if (input.duplicateDecisionType === "EXACT_DUPLICATE" || input.duplicateStatus === "EXACT_DUPLICATE") {
    return {
      key: "exactDuplicate",
      label: "Exact duplicate found",
      description: "A byte-level duplicate exists in this account.",
      tone: "info",
      retryable: false
    };
  }

  if (input.duplicateDecisionType === "LIKELY_DUPLICATE_REVIEW" || input.duplicateStatus === "LIKELY_DUPLICATE") {
    return {
      key: "reviewNeeded",
      label: "Likely duplicate - review needed",
      description: "Open compare/review for the side-by-side decision.",
      tone: "warning",
      retryable: false
    };
  }

  if (input.duplicateDecisionType === "SUPPRESSED_NEAR_DUPLICATE") {
    return {
      key: "suppressed",
      label: "Near-duplicate review suppressed",
      description: "Visual similarity was outweighed by structured differences.",
      tone: "info",
      retryable: false
    };
  }

  return {
    key: "newUpload",
    label: "New upload",
    description: "No duplicate review is required.",
    tone: "positive",
    retryable: false
  };
}

export function summarizeBatch(items: BatchOutcomeInput[]): BatchSummaryCounts {
  const counts: BatchSummaryCounts = {
    total: items.length,
    completed: 0,
    exactDuplicates: 0,
    reviewNeeded: 0,
    newUploads: 0,
    suppressed: 0,
    rejected: 0,
    failed: 0
  };

  for (const item of items) {
    const outcome = buildBatchOutcome(item);

    if (item.status === "completed") {
      counts.completed += 1;
    }

    if (outcome.key === "exactDuplicate") counts.exactDuplicates += 1;
    if (outcome.key === "reviewNeeded") counts.reviewNeeded += 1;
    if (outcome.key === "newUpload") counts.newUploads += 1;
    if (outcome.key === "suppressed") counts.suppressed += 1;
    if (outcome.key === "qualityRejected") counts.rejected += 1;
    if (outcome.key === "failed") counts.failed += 1;
  }

  return counts;
}

export function formatBatchSummary(counts: BatchSummaryCounts): string[] {
  const parts = [`${counts.total} file${counts.total === 1 ? "" : "s"} in batch`];

  if (counts.completed > 0) parts.push(`${counts.completed} completed`);
  if (counts.exactDuplicates > 0) parts.push(`${counts.exactDuplicates} exact duplicate${counts.exactDuplicates === 1 ? "" : "s"}`);
  if (counts.reviewNeeded > 0) parts.push(`${counts.reviewNeeded} need review`);
  if (counts.newUploads > 0) parts.push(`${counts.newUploads} new upload${counts.newUploads === 1 ? "" : "s"}`);
  if (counts.suppressed > 0) parts.push(`${counts.suppressed} suppressed near-duplicate${counts.suppressed === 1 ? "" : "s"}`);
  if (counts.rejected > 0) parts.push(`${counts.rejected} quality rejected`);
  if (counts.failed > 0) parts.push(`${counts.failed} failed`);

  return parts;
}

