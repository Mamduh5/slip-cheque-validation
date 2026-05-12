import { duplicateDecisionTypes, duplicateStatuses, documentTypes } from "@/lib/models";
import type { DuplicateDecisionType, DuplicateStatus, DocumentType } from "@/lib/models";
import type { ReviewQueueSort } from "@/lib/documents";
import type { DocumentReviewFilter } from "@/lib/formatters";

export function parseExportReviewFilter(value: string | null): DocumentReviewFilter {
  if (value === "pending" || value === "confirmed-duplicate" || value === "confirmed-distinct") {
    return value;
  }

  return "all";
}

export function parseExportDocumentType(value: string | null): DocumentType | undefined {
  return value && documentTypes.includes(value as DocumentType) ? (value as DocumentType) : undefined;
}

export function parseExportDuplicateStatus(value: string | null): DuplicateStatus | undefined {
  return value && duplicateStatuses.includes(value as DuplicateStatus) ? (value as DuplicateStatus) : undefined;
}

export function parseExportDuplicateDecisionType(value: string | null): DuplicateDecisionType | undefined {
  return value && duplicateDecisionTypes.includes(value as DuplicateDecisionType)
    ? (value as DuplicateDecisionType)
    : undefined;
}

export function parseExportReviewSort(value: string | null): ReviewQueueSort {
  if (value === "oldest" || value === "highest-similarity" || value === "lowest-similarity") {
    return value;
  }

  return "newest";
}

