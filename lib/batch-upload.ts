import type { DuplicateDecisionType, DuplicateStatus, QualityStatus, ReviewStatus } from "@/lib/models";
import { translate, type SupportedLocale } from "@/lib/i18n";

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

export function buildBatchOutcome(input: BatchOutcomeInput, locale: SupportedLocale = "en"): BatchOutcomeSummary {
  if (input.status === "waiting") {
    return {
      key: "waiting",
      label: translate(locale, "batchUpload.outcomes.waiting.label"),
      description: translate(locale, "batchUpload.outcomes.waiting.description"),
      tone: "neutral",
      retryable: false
    };
  }

  if (input.status === "uploading") {
    return {
      key: "uploading",
      label: translate(locale, "batchUpload.outcomes.uploading.label"),
      description: translate(locale, "batchUpload.outcomes.uploading.description"),
      tone: "info",
      retryable: false
    };
  }

  if (input.status === "processing") {
    return {
      key: "processing",
      label: translate(locale, "batchUpload.outcomes.processing.label"),
      description: translate(locale, "batchUpload.outcomes.processing.description"),
      tone: "info",
      retryable: false
    };
  }

  if (input.status === "rejected" || input.qualityStatus === "FAIL") {
    return {
      key: "qualityRejected",
      label: translate(locale, "batchUpload.outcomes.qualityRejected.label"),
      description: input.error ?? translate(locale, "batchUpload.outcomes.qualityRejected.description"),
      tone: "warning",
      retryable: true
    };
  }

  if (input.status === "failed") {
    return {
      key: "failed",
      label: translate(locale, "batchUpload.outcomes.failed.label"),
      description: input.error ?? translate(locale, "batchUpload.outcomes.failed.description"),
      tone: "danger",
      retryable: true
    };
  }

  if (input.duplicateDecisionType === "EXACT_DUPLICATE" || input.duplicateStatus === "EXACT_DUPLICATE") {
    return {
      key: "exactDuplicate",
      label: translate(locale, "batchUpload.outcomes.exactDuplicate.label"),
      description: translate(locale, "batchUpload.outcomes.exactDuplicate.description"),
      tone: "info",
      retryable: false
    };
  }

  if (input.duplicateDecisionType === "LIKELY_DUPLICATE_REVIEW" || input.duplicateStatus === "LIKELY_DUPLICATE") {
    return {
      key: "reviewNeeded",
      label: translate(locale, "batchUpload.outcomes.reviewNeeded.label"),
      description: translate(locale, "batchUpload.outcomes.reviewNeeded.description"),
      tone: "warning",
      retryable: false
    };
  }

  if (input.duplicateDecisionType === "SUPPRESSED_NEAR_DUPLICATE") {
    return {
      key: "suppressed",
      label: translate(locale, "batchUpload.outcomes.suppressed.label"),
      description: translate(locale, "batchUpload.outcomes.suppressed.description"),
      tone: "info",
      retryable: false
    };
  }

  return {
    key: "newUpload",
    label: translate(locale, "batchUpload.outcomes.newUpload.label"),
    description: translate(locale, "batchUpload.outcomes.newUpload.description"),
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

export function formatBatchSummary(counts: BatchSummaryCounts, locale: SupportedLocale = "en"): string[] {
  if (locale === "en") {
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

  const parts = [translate(locale, "batchUpload.summary.files", { count: counts.total })];

  if (counts.completed > 0) parts.push(translate(locale, "batchUpload.summary.completed", { count: counts.completed }));
  if (counts.exactDuplicates > 0) parts.push(translate(locale, "batchUpload.summary.exactDuplicates", { count: counts.exactDuplicates }));
  if (counts.reviewNeeded > 0) parts.push(translate(locale, "batchUpload.summary.reviewNeeded", { count: counts.reviewNeeded }));
  if (counts.newUploads > 0) parts.push(translate(locale, "batchUpload.summary.newUploads", { count: counts.newUploads }));
  if (counts.suppressed > 0) parts.push(translate(locale, "batchUpload.summary.suppressed", { count: counts.suppressed }));
  if (counts.rejected > 0) parts.push(translate(locale, "batchUpload.summary.rejected", { count: counts.rejected }));
  if (counts.failed > 0) parts.push(translate(locale, "batchUpload.summary.failed", { count: counts.failed }));

  return parts;
}

