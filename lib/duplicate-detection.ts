import type { DocumentRecord } from "@/lib/models";

export interface ExactDuplicateMatch {
  matchedDocumentId: string;
  similarityScore: 1;
}

export interface ExactDuplicateDecision {
  duplicateStatus: "NEW" | "EXACT_DUPLICATE";
  matchedDocumentId: string | null;
  similarityScore: number | null;
}

export interface NearDuplicateMatch {
  matchedDocumentId: string;
  similarityScore: number;
}

export interface DuplicateDecision {
  duplicateStatus: "NEW" | "EXACT_DUPLICATE" | "LIKELY_DUPLICATE";
  matchedDocumentId: string | null;
  similarityScore: number | null;
}

export function resolveExactDuplicateDecision(
  existingDocument: Pick<DocumentRecord, "_id"> | null
): ExactDuplicateDecision {
  if (!existingDocument?._id) {
    return {
      duplicateStatus: "NEW",
      matchedDocumentId: null,
      similarityScore: null
    };
  }

  return {
    duplicateStatus: "EXACT_DUPLICATE",
    matchedDocumentId: String(existingDocument._id),
    similarityScore: 1
  };
}

export function resolveDuplicateDecision(input: {
  exactMatch: Pick<DocumentRecord, "_id"> | null;
  nearMatch: NearDuplicateMatch | null;
}): DuplicateDecision {
  const exactDecision = resolveExactDuplicateDecision(input.exactMatch);

  if (exactDecision.duplicateStatus === "EXACT_DUPLICATE") {
    return exactDecision;
  }

  if (input.nearMatch) {
    return {
      duplicateStatus: "LIKELY_DUPLICATE",
      matchedDocumentId: input.nearMatch.matchedDocumentId,
      similarityScore: input.nearMatch.similarityScore
    };
  }

  return exactDecision;
}
