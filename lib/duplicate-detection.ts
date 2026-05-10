import type { DocumentRecord, DuplicateDecisionReason, DuplicateDecisionType } from "@/lib/models";

export interface ExactDuplicateMatch {
  matchedDocumentId: string;
  similarityScore: 1;
}

export interface ExactDuplicateDecision {
  duplicateStatus: "NEW" | "EXACT_DUPLICATE";
  duplicateDecisionType: DuplicateDecisionType;
  duplicateDecisionReasons: DuplicateDecisionReason[];
  matchedDocumentId: string | null;
  similarityScore: number | null;
}

export interface NearDuplicateMatch {
  matchedDocumentId: string;
  similarityScore: number;
}

export interface SuppressedNearDuplicate {
  duplicateDecisionReasons: DuplicateDecisionReason[];
}

export interface DuplicateDecision {
  duplicateStatus: "NEW" | "EXACT_DUPLICATE" | "LIKELY_DUPLICATE";
  duplicateDecisionType: DuplicateDecisionType;
  duplicateDecisionReasons: DuplicateDecisionReason[];
  matchedDocumentId: string | null;
  similarityScore: number | null;
}

export function resolveExactDuplicateDecision(
  existingDocument: Pick<DocumentRecord, "_id"> | null
): ExactDuplicateDecision {
  if (!existingDocument?._id) {
    return {
      duplicateStatus: "NEW",
      duplicateDecisionType: "NEW_UPLOAD",
      duplicateDecisionReasons: [],
      matchedDocumentId: null,
      similarityScore: null
    };
  }

  return {
    duplicateStatus: "EXACT_DUPLICATE",
    duplicateDecisionType: "EXACT_DUPLICATE",
    duplicateDecisionReasons: [],
    matchedDocumentId: String(existingDocument._id),
    similarityScore: 1
  };
}

export function resolveDuplicateDecision(input: {
  exactMatch: Pick<DocumentRecord, "_id"> | null;
  nearMatch: NearDuplicateMatch | null;
  suppressedNearDuplicate?: SuppressedNearDuplicate | null;
}): DuplicateDecision {
  const exactDecision = resolveExactDuplicateDecision(input.exactMatch);

  if (exactDecision.duplicateStatus === "EXACT_DUPLICATE") {
    return exactDecision;
  }

  if (input.nearMatch) {
    return {
      duplicateStatus: "LIKELY_DUPLICATE",
      duplicateDecisionType: "LIKELY_DUPLICATE_REVIEW",
      duplicateDecisionReasons: input.suppressedNearDuplicate?.duplicateDecisionReasons ?? ["IMAGE_SIMILARITY_ONLY"],
      matchedDocumentId: input.nearMatch.matchedDocumentId,
      similarityScore: input.nearMatch.similarityScore
    };
  }

  if (input.suppressedNearDuplicate) {
    return {
      duplicateStatus: "NEW",
      duplicateDecisionType: "SUPPRESSED_NEAR_DUPLICATE",
      duplicateDecisionReasons: input.suppressedNearDuplicate.duplicateDecisionReasons,
      matchedDocumentId: null,
      similarityScore: null
    };
  }

  return exactDecision;
}
